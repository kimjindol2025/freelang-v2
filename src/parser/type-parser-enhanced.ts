/**
 * Enhanced Type Parser - Task B
 *
 * Parses type annotations into structured TypeAnnotationObject
 * Supports: unions, generics, arrays, function types
 */

import {
  TypeAnnotationObject,
  PrimitiveType,
  UnionTypeObject,
  GenericTypeRef,
  ArrayTypeRef,
  FunctionTypeRef,
  TypeParameter
} from './ast';

export class EnhancedTypeParser {
  /**
   * Parse a type annotation string into structured object
   * Examples:
   *   "number" → { kind: 'primitive', name: 'number' }
   *   "string | number" → { kind: 'union', members: [...] }
   *   "array<string>" → { kind: 'array', element: ... }
   */
  static parseType(typeStr: string): TypeAnnotationObject {
    if (!typeStr || typeof typeStr !== 'string') {
      return { kind: 'primitive', name: 'any' };
    }

    const trimmed = typeStr.trim();
    return this.parseUnion(trimmed);
  }

  /**
   * Parse union types: A | B | C
   */
  private static parseUnion(typeStr: string): TypeAnnotationObject {
    // Split by pipe, but respect nesting (don't split inside < >)
    const members = this.splitByPipe(typeStr);

    if (members.length > 1) {
      return {
        kind: 'union',
        members: members.map(m => this.parseGeneric(m.trim()))
      };
    }

    return this.parseGeneric(typeStr);
  }

  /**
   * Parse generic types: Map<K, V>, Promise<T>, etc.
   */
  private static parseGeneric(typeStr: string): TypeAnnotationObject {
    const match = typeStr.match(/^(\w+)<(.+)>$/);
    if (!match) {
      return this.parseArray(typeStr);
    }

    const name = match[1];
    const argsStr = match[2];
    const args = this.splitByComma(argsStr);

    return {
      kind: 'generic',
      name,
      typeArguments: args.map(a => this.parseType(a.trim()))
    };
  }

  /**
   * Parse array types: [T] or array<T>
   */
  private static parseArray(typeStr: string): TypeAnnotationObject {
    // Handle [T] format
    if (typeStr.startsWith('[') && typeStr.endsWith(']')) {
      const element = typeStr.slice(1, -1).trim();
      return {
        kind: 'array',
        element: this.parseType(element)
      };
    }

    // Handle array<T> format
    if (typeStr.startsWith('array<') && typeStr.endsWith('>')) {
      const element = typeStr.slice(6, -1).trim();
      return {
        kind: 'array',
        element: this.parseType(element)
      };
    }

    return this.parsePrimitive(typeStr);
  }

  /**
   * Parse primitive types: number, string, boolean, etc.
   */
  private static parsePrimitive(typeStr: string): TypeAnnotationObject {
    const primitives = ['number', 'string', 'boolean', 'any', 'void', 'never'];
    if (primitives.includes(typeStr)) {
      return {
        kind: 'primitive',
        name: typeStr as any
      };
    }

    // Unknown type defaults to 'any'
    return { kind: 'primitive', name: 'any' };
  }

  /**
   * Split by pipe, respecting brackets
   */
  private static splitByPipe(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if ((char === '<' || char === '[' || char === '(') && depth >= 0) {
        depth++;
        current += char;
      } else if ((char === '>' || char === ']' || char === ')') && depth > 0) {
        depth--;
        current += char;
      } else if (char === '|' && depth === 0) {
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts.length > 0 ? parts : [str];
  }

  /**
   * Split by comma, respecting brackets
   */
  private static splitByComma(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if ((char === '<' || char === '[' || char === '(') && depth >= 0) {
        depth++;
        current += char;
      } else if ((char === '>' || char === ']' || char === ')') && depth > 0) {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts.length > 0 ? parts : [str];
  }

  /**
   * Parse type parameter declaration
   * Examples:
   *   "T" → { name: "T" }
   *   "T extends Serializable" → { name: "T", constraint: ... }
   *   "T = string" → { name: "T", default: ... }
   */
  static parseTypeParameter(paramStr: string): TypeParameter {
    const trimmed = paramStr.trim();
    const baseName = trimmed.split(/[\s=<]/)[0];

    let constraint: TypeAnnotationObject | undefined;
    let defaultType: TypeAnnotationObject | undefined;

    // Check for extends constraint
    const extendsMatch = trimmed.match(/extends\s+(.+?)(?:\s*=|$)/);
    if (extendsMatch) {
      constraint = this.parseType(extendsMatch[1].trim());
    }

    // Check for default value
    const defaultMatch = trimmed.match(/=\s*(.+?)$/);
    if (defaultMatch) {
      defaultType = this.parseType(defaultMatch[1].trim());
    }

    return {
      name: baseName,
      constraint,
      default: defaultType
    };
  }

  /**
   * Parse type parameters list: <T, U extends Serializable, V = string>
   */
  static parseTypeParameters(paramsStr: string): TypeParameter[] {
    if (!paramsStr || !paramsStr.includes('<')) {
      return [];
    }

    // Extract content between < and >
    const match = paramsStr.match(/<(.+)>/);
    if (!match) {
      return [];
    }

    const content = match[1];
    const params = this.splitByComma(content);

    return params.map(p => this.parseTypeParameter(p.trim()));
  }

  /**
   * Convert TypeAnnotationObject back to string (for diagnostics)
   */
  static typeToString(type: TypeAnnotationObject): string {
    switch (type.kind) {
      case 'primitive':
        return (type as PrimitiveType).name;

      case 'union':
        return (type as UnionTypeObject).members
          .map(m => this.typeToString(m))
          .join(' | ');

      case 'array':
        const elementType = this.typeToString((type as ArrayTypeRef).element);
        return `[${elementType}]`;

      case 'generic':
        const gen = type as GenericTypeRef;
        const args = gen.typeArguments
          .map(a => this.typeToString(a))
          .join(', ');
        return `${gen.name}<${args}>`;

      case 'function':
        const func = type as FunctionTypeRef;
        const params = func.paramTypes
          .map(p => this.typeToString(p))
          .join(', ');
        const ret = this.typeToString(func.returnType);
        return `(${params}) => ${ret}`;

      default:
        return 'unknown';
    }
  }
}
