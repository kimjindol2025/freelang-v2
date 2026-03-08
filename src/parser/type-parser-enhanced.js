"use strict";
/**
 * Enhanced Type Parser - Task B
 *
 * Parses type annotations into structured TypeAnnotationObject
 * Supports: unions, generics, arrays, function types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedTypeParser = void 0;
class EnhancedTypeParser {
    /**
     * Parse a type annotation string into structured object
     * Examples:
     *   "number" → { kind: 'primitive', name: 'number' }
     *   "string | number" → { kind: 'union', members: [...] }
     *   "array<string>" → { kind: 'array', element: ... }
     */
    static parseType(typeStr) {
        if (!typeStr || typeof typeStr !== 'string') {
            return { kind: 'primitive', name: 'any' };
        }
        const trimmed = typeStr.trim();
        return this.parseUnion(trimmed);
    }
    /**
     * Parse union types: A | B | C
     */
    static parseUnion(typeStr) {
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
    static parseGeneric(typeStr) {
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
    static parseArray(typeStr) {
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
    static parsePrimitive(typeStr) {
        const primitives = ['number', 'string', 'boolean', 'any', 'void', 'never'];
        if (primitives.includes(typeStr)) {
            return {
                kind: 'primitive',
                name: typeStr
            };
        }
        // Unknown type defaults to 'any'
        return { kind: 'primitive', name: 'any' };
    }
    /**
     * Split by pipe, respecting brackets
     */
    static splitByPipe(str) {
        const parts = [];
        let current = '';
        let depth = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if ((char === '<' || char === '[' || char === '(') && depth >= 0) {
                depth++;
                current += char;
            }
            else if ((char === '>' || char === ']' || char === ')') && depth > 0) {
                depth--;
                current += char;
            }
            else if (char === '|' && depth === 0) {
                if (current.trim()) {
                    parts.push(current.trim());
                }
                current = '';
            }
            else {
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
    static splitByComma(str) {
        const parts = [];
        let current = '';
        let depth = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if ((char === '<' || char === '[' || char === '(') && depth >= 0) {
                depth++;
                current += char;
            }
            else if ((char === '>' || char === ']' || char === ')') && depth > 0) {
                depth--;
                current += char;
            }
            else if (char === ',' && depth === 0) {
                if (current.trim()) {
                    parts.push(current.trim());
                }
                current = '';
            }
            else {
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
    static parseTypeParameter(paramStr) {
        const trimmed = paramStr.trim();
        const baseName = trimmed.split(/[\s=<]/)[0];
        let constraint;
        let defaultType;
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
    static parseTypeParameters(paramsStr) {
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
    static typeToString(type) {
        switch (type.kind) {
            case 'primitive':
                return type.name;
            case 'union':
                return type.members
                    .map(m => this.typeToString(m))
                    .join(' | ');
            case 'array':
                const elementType = this.typeToString(type.element);
                return `[${elementType}]`;
            case 'generic':
                const gen = type;
                const args = gen.typeArguments
                    .map(a => this.typeToString(a))
                    .join(', ');
                return `${gen.name}<${args}>`;
            case 'function':
                const func = type;
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
exports.EnhancedTypeParser = EnhancedTypeParser;
