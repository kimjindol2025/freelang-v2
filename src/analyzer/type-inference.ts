/**
 * Phase 1 Task 1.3: Type Inference Engine
 *
 * Automatically infers types for:
 * - Function parameters
 * - Return values
 * - Variable assignments
 * - Expressions
 *
 * Features:
 * - Pattern-based inference (e.g., arr[0] = number → arr is array<number>)
 * - Operation-based inference (number + number = number)
 * - Context-based inference (for i in 0..10 → i is number)
 * - Nested type inference (array<array<number>>)
 */

export interface TypeInfo {
  name: string; // Variable or parameter name
  type: string; // Inferred type (number, string, bool, array, etc.)
  confidence: number; // 0.0 ~ 1.0 confidence level
  source: 'explicit' | 'inferred' | 'context'; // How type was determined
  examples?: unknown[]; // Example values seen
}

export interface InferenceContext {
  variables: Map<string, TypeInfo>;
  functions: Map<string, { params: TypeInfo[]; returns: string }>;
  loopVariables: Map<string, string>; // for i in 0..10 → i:number
}

export class TypeInferenceEngine {
  private context: InferenceContext;
  private typePatterns: Map<string, string[]> = new Map();

  constructor() {
    this.context = {
      variables: new Map(),
      functions: new Map(),
      loopVariables: new Map(),
    };
    this.initializePatterns();
  }

  /**
   * Initialize type pattern rules
   */
  private initializePatterns(): void {
    // Numbers
    this.typePatterns.set('number', [
      '\\d+(\\.\\d+)?',           // 42, 3.14
      '(number|int|float)',       // type keywords
      '(sum|count|length)',       // common number functions
      '(\\+|-|\\*|/|%)',          // arithmetic ops
    ]);

    // Strings
    this.typePatterns.set('string', [
      '"[^"]*"',                  // "hello"
      "'[^']*'",                  // 'world'
      '(string|str)',             // type keywords
      '(concat|substring|split)', // string functions
    ]);

    // Booleans
    this.typePatterns.set('bool', [
      '(true|false)',             // literal booleans
      '(bool|boolean)',           // type keywords
      '(&&|\\|\\||!)',            // logical ops
      '(>|<|==|!=|>=|<=)',        // comparison ops
    ]);

    // Arrays
    this.typePatterns.set('array', [
      '\\[.*\\]',                 // [1, 2, 3]
      '(array|list|vec)',         // type keywords
      '\\.(map|filter|reduce)',   // array methods
      '(for .* in)',              // for loops → array
    ]);
  }

  /**
   * Infer type from code tokens
   */
  public inferFromTokens(tokens: string[]): TypeInfo[] {
    const inferred: TypeInfo[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Look for assignment: var = value
      if (i + 2 < tokens.length && tokens[i + 1] === '=') {
        const varName = token;
        const value = tokens[i + 2];
        const type = this.inferTypeFromValue(value);

        if (type) {
          inferred.push({
            name: varName,
            type,
            confidence: 0.8,
            source: 'inferred',
          });
        }
      }

      // Look for type annotations: var: type
      if (i + 2 < tokens.length && tokens[i + 1] === ':') {
        const varName = token;
        const type = tokens[i + 2];

        inferred.push({
          name: varName,
          type,
          confidence: 1.0,
          source: 'explicit',
        });
      }

      // Look for for loops: for var in range (must be at least 4 tokens away)
      if (token === 'for' && i + 3 < tokens.length) {
        if (tokens[i + 2] === 'in') {
          const loopVar = tokens[i + 1];
          this.context.loopVariables.set(loopVar, 'number');

          inferred.push({
            name: loopVar,
            type: 'number',
            confidence: 1.0,
            source: 'context',
          });
        }
      }
    }

    return inferred;
  }

  /**
   * Infer type from a value string
   */
  private inferTypeFromValue(value: string): string | null {
    // Check each type pattern
    for (const [type, patterns] of this.typePatterns) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern);
        if (regex.test(value)) {
          return type;
        }
      }
    }

    return null;
  }

  /**
   * Infer return type from function body
   * IMPROVED: Better priority, avoid false positives
   *
   * Strategies (in priority order):
   * 1. Explicit return statements
   * 2. Method calls on returned values
   * 3. Array/string operations
   * 4. Comparison/logical operations
   */
  public inferReturnType(body: string): string {
    const lines = body.split('\n');

    // Strategy 1: Explicit return statements (highest priority)
    for (const line of lines) {
      const returnMatch = line.match(/return\s+(.+)/);
      if (returnMatch) {
        const value = returnMatch[1].trim();

        // Use our improved expression type inference
        const type = this.inferExpressionType(value);
        if (type !== 'any') {
          return type;
        }
      }
    }

    // Strategy 2: Array methods (.map, .filter, etc.) return arrays
    if (body.includes('.map') || body.includes('.filter') || body.includes('.reduce')) {
      return 'array';
    }

    // Strategy 3: String methods return strings
    if (body.includes('.substring') || body.includes('.concat') ||
        body.includes('.toUpperCase') || body.includes('.toLowerCase') ||
        body.includes('.trim')) {
      return 'string';
    }

    // Strategy 4: Array literal or array operations
    if (body.includes('[]') || body.includes('.push') || body.includes('.pop')) {
      return 'array';
    }

    // Strategy 5: Logical/comparison operations (must check BEFORE arithmetic)
    if (body.includes('&&') || body.includes('||') || body.includes('==') ||
        body.includes('!=') || body.includes('>') || body.includes('<')) {
      // Check if these are in return statements
      for (const line of lines) {
        if (line.includes('return') &&
            (line.includes('>') || line.includes('<') || line.includes('==') ||
             line.includes('!=') || line.includes('&&') || line.includes('||'))) {
          return 'bool';
        }
      }
    }

    // Strategy 6: Arithmetic operations (- * / for sure number, + might be string)
    if (body.includes('-') || body.includes('*') || body.includes('/') || body.includes('%')) {
      return 'number';
    }

    // Default: assume number (most common return type in loops/arithmetic)
    return 'number';
  }

  /**
   * Infer parameter types from function usage
   *
   * Analyzes how parameters are used:
   * - arr[0] → arr is array
   * - x + 5 → x is number
   * - str.length → str is string
   */
  public inferParamTypes(paramNames: string[], body: string): Map<string, string> {
    const types = new Map<string, string>();

    for (const param of paramNames) {
      let inferredType = 'any'; // default (avoid false positives)

      // Priority 1: Method calls (most reliable)

      // String methods: param.length, param.substring, param.concat, etc.
      if (new RegExp(`${param}\\.(length|substring|concat|split|toUpperCase|toLowerCase|trim|includes)`).test(body)) {
        inferredType = 'string';
      }
      // Array methods: param.map, param.filter, param.reduce, etc.
      else if (new RegExp(`${param}\\.(map|filter|reduce|forEach|push|pop|slice)`).test(body)) {
        inferredType = 'array';
      }
      // Priority 2: Array access: param[...]
      else if (new RegExp(`${param}\\[`).test(body)) {
        inferredType = 'array';
      }
      // Priority 3: Operations
      else {
        // Arithmetic operations: before or after the operator
        // param - x, x - param, param * x, x * param, etc.
        if (new RegExp(`${param}\\s*[\\-*/%]|[\\-*/%]\\s*${param}`).test(body)) {
          inferredType = 'number';
        }
        // Addition: could be string or number (param + x or x + param)
        else if (new RegExp(`${param}\\s*\\+|\\+\\s*${param}`).test(body)) {
          // Check context: if appears with string literals, it's string
          const addContext = body.match(new RegExp(`[^\\n]*${param}[^\\n]*\\+[^\\n]*|[^\\n]*\\+[^\\n]*${param}[^\\n]*`));
          if (addContext && /["']/.test(addContext[0])) {
            inferredType = 'string';
          } else {
            inferredType = 'number';
          }
        }
        // Comparison/logical operations
        else if (new RegExp(`${param}\\s*(&&|\\|\\||!|==|!=|>|<)`).test(body)) {
          if (new RegExp(`${param}\\s*(&&|\\|\\||!)`).test(body)) {
            inferredType = 'bool';
          } else {
            inferredType = 'number'; // comparisons usually with numbers
          }
        }
      }

      types.set(param, inferredType);
    }

    return types;
  }

  /**
   * Infer type of an expression
   * IMPROVED: Better context awareness, correct binary operation typing
   *
   * Handles:
   * - Binary operations: number + number = number, string + string = string
   * - Array operations: array.map = array
   * - Function calls: parseInt("123") = number
   */
  public inferExpressionType(expr: string): string {
    // 1. Check literals first (most reliable)

    // Array literals: [1, 2, 3]
    if (expr.startsWith('[') && expr.endsWith(']')) {
      return 'array';
    }

    // String literals: "hello" or 'world'
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return 'string';
    }

    // Boolean literals
    if (expr === 'true' || expr === 'false') {
      return 'bool';
    }

    // Number literals
    if (/^\d+(\.\d+)?$/.test(expr)) {
      return 'number';
    }

    // 2. Check method calls (methods determine type)

    // Array methods return arrays
    if (expr.includes('.map') || expr.includes('.filter') || expr.includes('.slice')) {
      return 'array';
    }

    // String methods return strings
    if (expr.includes('.substring') || expr.includes('.concat') || expr.includes('.split') ||
        expr.includes('.toUpperCase') || expr.includes('.toLowerCase') || expr.includes('.trim')) {
      return 'string';
    }

    // 3. Check function calls

    if (expr.includes('parseInt') || expr.includes('parseFloat')) return 'number';
    if (expr.includes('Math.')) return 'number';
    if (expr.includes('JSON.parse')) return 'object';

    // 4. Check binary operations (FIXED: better type handling)

    // String concatenation: "text" + "more" or "text" + variable
    if (expr.includes('+')) {
      const hasStringLiteral = /["']/.test(expr);
      if (hasStringLiteral) {
        return 'string';  // String concatenation
      }
      // Check if expression looks like number arithmetic (10 + 5 or 10 + 5 * 2)
      // If there are other arithmetic operators (*, /, -), it's number arithmetic
      if (/[\-*/%]/.test(expr)) {
        return 'number';
      }
      // Check if both sides are numbers (e.g., 10 + 5)
      const parts = expr.split('+').map(s => s.trim());
      if (parts.length === 2 && /^\d+(\.\d+)?$/.test(parts[0]) && /^\d+(\.\d+)?$/.test(parts[1])) {
        // Both sides are number literals
        return 'number';
      }
      // Otherwise uncertain (could be number + variable or variable + anything)
      return 'any';
    }

    // Arithmetic: - * / % are only for numbers
    if (/[\-*/%]/.test(expr) && !expr.includes('.')) {
      return 'number';
    }

    // 5. Check comparison/logical operations (before defaults)

    // Comparison expressions return boolean (must check before +/-)
    if (/[><=!]=?/.test(expr) && !expr.includes('++') && !expr.includes('--')) {
      return 'bool';
    }

    // Logical expressions (AND, OR, NOT)
    if (/&&|\|\||!/.test(expr)) {
      return 'bool';
    }

    // 6. Default
    return 'any';
  }

  /**
   * Register a function with inferred signature
   */
  public registerFunction(
    name: string,
    params: TypeInfo[],
    returnType: string
  ): void {
    this.context.functions.set(name, {
      params,
      returns: returnType,
    });
  }

  /**
   * Get inference context
   */
  public getContext(): InferenceContext {
    return this.context;
  }

  /**
   * Reset context
   */
  public reset(): void {
    this.context = {
      variables: new Map(),
      functions: new Map(),
      loopVariables: new Map(),
    };
  }

  /**
   * Generate type annotation from inferred types
   */
  public generateTypeAnnotation(
    varName: string,
    type: string,
    confidence: number
  ): string {
    if (confidence >= 0.9) {
      return `${varName}: ${type}`;
    } else if (confidence >= 0.7) {
      return `${varName}: ${type} // inferred`;
    } else {
      return `${varName}: ${type}? // uncertain`;
    }
  }

  /**
   * Merge type information from multiple sources
   */
  public mergeTypes(...types: string[]): string {
    // If all types are the same, return that type
    if (new Set(types).size === 1) {
      return types[0];
    }

    // If mixed, return union type
    return types.join(' | ');
  }
}
