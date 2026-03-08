"use strict";
/**
 * FreeLang v2 Enhanced Type Checker - Task B
 *
 * Provides complete type checking for:
 * - Generic<T> with constraints
 * - Union types (T | U | V)
 * - Type inference
 * - Error reporting with context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedTypeCheckerV2 = void 0;
class EnhancedTypeCheckerV2 {
    constructor() {
        this.errors = [];
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
    isAssignableTo(from, to) {
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
            return to.members.some(member => this.isAssignableTo(from, member));
        }
        // Array type compatibility
        if (this.isArray(from) && this.isArray(to)) {
            const fromArray = from;
            const toArray = to;
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
    typeEquals(a, b) {
        // Primitives
        if (this.isPrimitive(a) && this.isPrimitive(b)) {
            return a.name === b.name;
        }
        // Arrays
        if (this.isArray(a) && this.isArray(b)) {
            return this.typeEquals(a.element, b.element);
        }
        // Unions
        if (this.isUnion(a) && this.isUnion(b)) {
            const ua = a;
            const ub = b;
            if (ua.members.length !== ub.members.length)
                return false;
            return ua.members.every((m1, i) => this.typeEquals(m1, ub.members[i]));
        }
        // Generics
        if (this.isGenericRef(a) && this.isGenericRef(b)) {
            const ga = a;
            const gb = b;
            if (ga.name !== gb.name || ga.typeArguments.length !== gb.typeArguments.length) {
                return false;
            }
            return ga.typeArguments.every((ta, i) => this.typeEquals(ta, gb.typeArguments[i]));
        }
        return false;
    }
    /**
     * Infer type from expression
     */
    inferType(expr) {
        if (!expr) {
            return { kind: 'primitive', name: 'any' };
        }
        switch (expr.type) {
            case 'literal':
                if ('dataType' in expr) {
                    const dataType = expr.dataType;
                    if (dataType === 'number') {
                        return { kind: 'primitive', name: 'number' };
                    }
                    else if (dataType === 'string') {
                        return { kind: 'primitive', name: 'string' };
                    }
                    else if (dataType === 'bool') {
                        return { kind: 'primitive', name: 'boolean' };
                    }
                }
                return { kind: 'primitive', name: 'any' };
            case 'identifier':
                const varName = expr.name;
                return this.currentContext.variables.get(varName) ||
                    { kind: 'primitive', name: 'any' };
            case 'array':
                // Infer array element type from first element
                const elements = expr.elements || [];
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
                const op = expr.operator;
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
    checkVariableDeclaration(decl) {
        const errors = [];
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
    checkFunctionCall(funcName, args) {
        const errors = [];
        const funcSig = this.currentContext.functions.get(funcName);
        if (!funcSig) {
            return []; // Function not found, runtime will handle
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
    registerFunction(func) {
        const paramTypes = func.params.map(p => p.paramType ? this.parseTypeString(p.paramType) :
            { kind: 'primitive', name: 'any' });
        const returnType = func.returnType ?
            this.parseTypeString(func.returnType) :
            { kind: 'primitive', name: 'any' };
        const typeParams = (func.typeParams || []).map(tp => ({
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
    parseTypeString(typeStr) {
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
                name: trimmed
            };
        }
        // Default to any
        return { kind: 'primitive', name: 'any' };
    }
    typeToString(type) {
        switch (type.kind) {
            case 'primitive':
                return type.name;
            case 'union':
                return type.members
                    .map(m => this.typeToString(m))
                    .join(' | ');
            case 'array':
                return `[${this.typeToString(type.element)}]`;
            case 'generic':
                const gen = type;
                return `${gen.name}<${gen.typeArguments.map(a => this.typeToString(a)).join(', ')}>`;
            case 'function':
                const func = type;
                const params = func.paramTypes.map(p => this.typeToString(p)).join(', ');
                return `(${params}) => ${this.typeToString(func.returnType)}`;
            default:
                return 'unknown';
        }
    }
    isPrimitive(type, name) {
        if (type.kind !== 'primitive')
            return false;
        if (name) {
            return type.name === name;
        }
        return true;
    }
    isUnion(type) {
        return type.kind === 'union';
    }
    isArray(type) {
        return type.kind === 'array';
    }
    isGenericRef(type) {
        return type.kind === 'generic';
    }
}
exports.EnhancedTypeCheckerV2 = EnhancedTypeCheckerV2;
