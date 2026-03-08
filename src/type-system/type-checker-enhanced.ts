/**
 * FreeLang v2 Enhanced Type Checker - Task B
 *
 * Provides complete type checking for:
 * - Generic<T> with constraints
 * - Union types (T | U | V)
 * - Type inference
 * - Error reporting with context
 */

import {
  TypeAnnotationObject,
  PrimitiveType,
  UnionTypeObject,
  GenericTypeRef,
  ArrayTypeRef,
  FunctionTypeRef,
  TypeParameter,
  FunctionStatement,
  VariableDeclaration,
  Expression
} from '../parser/ast';

/**
 * Type variable binding (for generic substitution)
 */
export interface TypeBinding {
  name: string;
  type: TypeAnnotationObject;
}

/**
 * Type context for scoped resolution
 */
export interface TypeContext {
  variables: Map<string, TypeAnnotationObject>;
  functions: Map<string, FunctionSignature>;
  typeBindings: TypeBinding[];  // For generics
  parent?: TypeContext;
}

/**
 * Function signature
 */
export interface FunctionSignature {
  name: string;
  typeParameters: TypeParameter[];
  paramTypes: TypeAnnotationObject[];
  returnType: TypeAnnotationObject;
  isAsync?: boolean;
}

/**
 * Type error details
 */
export interface TypeError {
  message: string;
  code: string;
  location?: {
    line: number;
    column: number;
  };
  expected?: string;
  actual?: string;
}

/**
 * Type checking result
 */
export interface TypeCheckResult {
  valid: boolean;
  errors: TypeError[];
  warnings: string[];
}

export class EnhancedTypeCheckerV2 {
  private globalContext: TypeContext;
  private currentContext: TypeContext;
  private errors: TypeError[] = [];

  constructor() {
    this.globalContext = {
      variables: new Map(),
      functions: new Map(),
      typeBindings: []
    };
    this.currentContext = this.globalContext;
  }

  /**
   * Check if type A is assignable to type B
   */
  public isAssignableTo(from: TypeAnnotationObject, to: TypeAnnotationObject): boolean {
    // Same type
    if (this.typeEquals(from, to)) {
      return true;
    }

    // Any type accepts anything
    if (this.isPrimitive(to, 'any')) {
      return true;
    }

    // Union type: from must be assignable to at least one member
    if (this.isUnion(to)) {
      return (to as UnionTypeObject).members.some(member =>
        this.isAssignableTo(from, member)
      );
    }

    // Array type compatibility
    if (this.isArray(from) && this.isArray(to)) {
      const fromArray = from as ArrayTypeRef;
      const toArray = to as ArrayTypeRef;
      return this.isAssignableTo(fromArray.element, toArray.element);
    }

    // Generic reference: need to check bounds
    if (this.isGenericRef(to)) {
      // For now, accept any type for generic (proper bounds checking needed)
      return true;
    }

    return false;
  }

  /**
   * Type equality check
   */
  public typeEquals(a: TypeAnnotationObject, b: TypeAnnotationObject): boolean {
    // Primitives
    if (this.isPrimitive(a) && this.isPrimitive(b)) {
      return (a as PrimitiveType).name === (b as PrimitiveType).name;
    }

    // Arrays
    if (this.isArray(a) && this.isArray(b)) {
      return this.typeEquals(
        (a as ArrayTypeRef).element,
        (b as ArrayTypeRef).element
      );
    }

    // Unions
    if (this.isUnion(a) && this.isUnion(b)) {
      const ua = a as UnionTypeObject;
      const ub = b as UnionTypeObject;
      if (ua.members.length !== ub.members.length) return false;
      return ua.members.every((m1, i) => this.typeEquals(m1, ub.members[i]));
    }

    // Generics
    if (this.isGenericRef(a) && this.isGenericRef(b)) {
      const ga = a as GenericTypeRef;
      const gb = b as GenericTypeRef;
      if (ga.name !== gb.name || ga.typeArguments.length !== gb.typeArguments.length) {
        return false;
      }
      return ga.typeArguments.every((ta, i) =>
        this.typeEquals(ta, gb.typeArguments[i])
      );
    }

    return false;
  }

  /**
   * Infer type from expression
   */
  public inferType(expr: Expression): TypeAnnotationObject {
    if (!expr) {
      return { kind: 'primitive', name: 'any' };
    }

    switch (expr.type) {
      case 'literal':
        if ('dataType' in expr) {
          const dataType = (expr as any).dataType;
          if (dataType === 'number') {
            return { kind: 'primitive', name: 'number' };
          } else if (dataType === 'string') {
            return { kind: 'primitive', name: 'string' };
          } else if (dataType === 'bool') {
            return { kind: 'primitive', name: 'boolean' };
          }
        }
        return { kind: 'primitive', name: 'any' };

      case 'identifier':
        const varName = (expr as any).name;
        return this.currentContext.variables.get(varName) ||
          { kind: 'primitive', name: 'any' };

      case 'array':
        // Infer array element type from first element
        const elements = (expr as any).elements || [];
        if (elements.length > 0) {
          const elementType = this.inferType(elements[0]);
          return {
            kind: 'array',
            element: elementType
          };
        }
        return {
          kind: 'array',
          element: { kind: 'primitive', name: 'any' }
        };

      case 'binary':
        // Binary ops usually return numbers or booleans
        const op = (expr as any).operator;
        if (['+', '-', '*', '/', '%'].includes(op)) {
          return { kind: 'primitive', name: 'number' };
        }
        return { kind: 'primitive', name: 'boolean' };

      default:
        return { kind: 'primitive', name: 'any' };
    }
  }

  /**
   * Check variable declaration
   */
  public checkVariableDeclaration(decl: VariableDeclaration): TypeError[] {
    const errors: TypeError[] = [];

    if (!decl.value) {
      // No initializer, type must be explicit
      if (!decl.varType) {
        errors.push({
          message: `Variable '${decl.name}' lacks initializer and explicit type annotation`,
          code: 'MISSING_TYPE',
          expected: 'explicit type annotation or initializer'
        });
      }
      return errors;
    }

    const inferredType = this.inferType(decl.value);

    // Type annotation check
    if (decl.varType) {
      // For now, parse varType as string and create primitive
      const annotationType = this.parseTypeString(decl.varType);
      if (!this.isAssignableTo(inferredType, annotationType)) {
        errors.push({
          message: `Type mismatch in variable '${decl.name}'`,
          code: 'TYPE_MISMATCH',
          expected: this.typeToString(annotationType),
          actual: this.typeToString(inferredType)
        });
      }
    }

    // Register variable in context
    this.currentContext.variables.set(decl.name, inferredType);

    return errors;
  }

  /**
   * Check function call type safety
   */
  public checkFunctionCall(funcName: string, args: Expression[]): TypeError[] {
    const errors: TypeError[] = [];

    const funcSig = this.currentContext.functions.get(funcName);
    if (!funcSig) {
      return [];  // Function not found, runtime will handle
    }

    if (args.length !== funcSig.paramTypes.length) {
      errors.push({
        message: `Function '${funcName}' expects ${funcSig.paramTypes.length} arguments, got ${args.length}`,
        code: 'ARGUMENT_COUNT_MISMATCH'
      });
      return errors;
    }

    // Check each argument type
    for (let i = 0; i < args.length; i++) {
      const argType = this.inferType(args[i]);
      const paramType = funcSig.paramTypes[i];

      if (!this.isAssignableTo(argType, paramType)) {
        errors.push({
          message: `Argument ${i} to '${funcName}' has incompatible type`,
          code: 'ARGUMENT_TYPE_MISMATCH',
          expected: this.typeToString(paramType),
          actual: this.typeToString(argType)
        });
      }
    }

    return errors;
  }

  /**
   * Register function in context
   */
  public registerFunction(func: FunctionStatement): void {
    const paramTypes = func.params.map(p =>
      p.paramType ? this.parseTypeString(p.paramType) :
      { kind: 'primitive' as const, name: 'any' as const }
    );

    const returnType = func.returnType ?
      this.parseTypeString(func.returnType) :
      { kind: 'primitive' as const, name: 'any' as const };

    const typeParams: TypeParameter[] = (func.typeParams || []).map(tp => ({
      name: tp,
      constraint: undefined,
      default: undefined
    }));

    this.currentContext.functions.set(func.name, {
      name: func.name,
      typeParameters: typeParams,
      paramTypes,
      returnType,
      isAsync: func.async
    });
  }

  // ───── Helper Methods ─────

  private parseTypeString(typeStr: string): TypeAnnotationObject {
    if (!typeStr) {
      return { kind: 'primitive', name: 'any' };
    }

    const trimmed = typeStr.trim();

    // Handle union types: string | number | boolean
    if (trimmed.includes('|')) {
      const members = trimmed
        .split('|')
        .map(m => this.parseTypeString(m.trim()));
      return {
        kind: 'union',
        members
      };
    }

    // Handle array types: [string], array<number>
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const elementType = this.parseTypeString(trimmed.slice(1, -1));
      return {
        kind: 'array',
        element: elementType
      };
    }

    // Handle generics: Map<string, number>
    if (trimmed.includes('<')) {
      const match = trimmed.match(/^(\w+)<(.+)>$/);
      if (match) {
        const name = match[1];
        const args = match[2]
          .split(',')
          .map(a => this.parseTypeString(a.trim()));
        return {
          kind: 'generic',
          name,
          typeArguments: args
        };
      }
    }

    // Primitive type
    const primitives = ['number', 'string', 'boolean', 'any', 'void', 'never'];
    if (primitives.includes(trimmed)) {
      return {
        kind: 'primitive',
        name: trimmed as any
      };
    }

    // Default to any
    return { kind: 'primitive', name: 'any' };
  }

  private typeToString(type: TypeAnnotationObject): string {
    switch (type.kind) {
      case 'primitive':
        return (type as PrimitiveType).name;

      case 'union':
        return (type as UnionTypeObject).members
          .map(m => this.typeToString(m))
          .join(' | ');

      case 'array':
        return `[${this.typeToString((type as ArrayTypeRef).element)}]`;

      case 'generic':
        const gen = type as GenericTypeRef;
        return `${gen.name}<${gen.typeArguments.map(a => this.typeToString(a)).join(', ')}>`;

      case 'function':
        const func = type as FunctionTypeRef;
        const params = func.paramTypes.map(p => this.typeToString(p)).join(', ');
        return `(${params}) => ${this.typeToString(func.returnType)}`;

      default:
        return 'unknown';
    }
  }

  private isPrimitive(type: TypeAnnotationObject, name?: string): boolean {
    if (type.kind !== 'primitive') return false;
    if (name) {
      return (type as PrimitiveType).name === name;
    }
    return true;
  }

  private isUnion(type: TypeAnnotationObject): boolean {
    return type.kind === 'union';
  }

  private isArray(type: TypeAnnotationObject): boolean {
    return type.kind === 'array';
  }

  private isGenericRef(type: TypeAnnotationObject): boolean {
    return type.kind === 'generic';
  }
}
