/**
 * FreeLang v2 Parser Optimization (Phase C-1)
 *
 * Optimizations:
 * 1. Operator precedence caching
 * 2. Token lookahead buffer
 * 3. Node pool (object reuse pattern)
 */

import { Token, TokenType } from '../lexer/token';

/**
 * Operator precedence lookup table with caching
 */
export class OperatorPrecedenceCache {
  private cache: Map<string, number> = new Map();

  // Precedence levels
  private static readonly PRECEDENCE_TABLE: { [key: string]: number } = {
    '||': 1,
    '&&': 2,
    '|': 3,
    '^': 4,
    '&': 5,
    '==': 6,
    '!=': 6,
    '<': 7,
    '>': 7,
    '<=': 7,
    '>=': 7,
    'in': 7,
    'instanceof': 7,
    '<<': 8,
    '>>': 8,
    '>>>': 8,
    '+': 9,
    '-': 9,
    '*': 10,
    '/': 10,
    '%': 10,
    '**': 11
  };

  /**
   * Get operator precedence with caching
   */
  getPrecedence(operator: string): number {
    // Check cache first
    if (this.cache.has(operator)) {
      return this.cache.get(operator)!;
    }

    // Lookup in table
    const precedence = OperatorPrecedenceCache.PRECEDENCE_TABLE[operator] ?? 0;

    // Cache result
    this.cache.set(operator, precedence);

    return precedence;
  }

  /**
   * Check if operator exists
   */
  isOperator(operator: string): boolean {
    return OperatorPrecedenceCache.PRECEDENCE_TABLE.hasOwnProperty(operator);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

/**
 * Token lookahead buffer for efficient peeking
 */
export class TokenLookaheadBuffer {
  private tokens: Token[];
  private pos: number = 0;
  private current_: Token;
  private lookahead_: Token;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
    this.current_ = tokens[0] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
    this.lookahead_ = tokens[1] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  /**
   * Get current token (cached)
   */
  current(): Token {
    return this.current_;
  }

  /**
   * Get lookahead token (cached)
   */
  lookahead(): Token {
    return this.lookahead_;
  }

  /**
   * Peek at token with offset
   */
  peek(offset: number = 1): Token {
    const index = this.pos + offset;
    if (index >= this.tokens.length) {
      return { type: TokenType.EOF, value: '', line: 0, column: 0 };
    }
    return this.tokens[index];
  }

  /**
   * Advance to next token (fast path)
   */
  advance(): Token {
    const prev = this.current_;
    this.pos++;

    // Fast path: use preloaded lookahead
    this.current_ = this.lookahead_;

    // Reload lookahead
    const nextIndex = this.pos + 1;
    if (nextIndex < this.tokens.length) {
      this.lookahead_ = this.tokens[nextIndex];
    } else {
      this.lookahead_ = { type: TokenType.EOF, value: '', line: 0, column: 0 };
    }

    return prev;
  }

  /**
   * Get current position
   */
  position(): number {
    return this.pos;
  }

  /**
   * Set position
   */
  seek(pos: number): void {
    this.pos = pos;
    this.current_ = this.tokens[pos] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
    this.lookahead_ = this.tokens[pos + 1] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  /**
   * Check if at end
   */
  isAtEnd(): boolean {
    return this.current_.type === TokenType.EOF;
  }
}

/**
 * Node pool for object reuse (Object Pool Pattern)
 */
export class ASTNodePool {
  private pool: any[] = [];
  private used: number = 0;

  /**
   * Allocate a node from pool or create new
   */
  allocate(type: string, data: any = {}): any {
    let node: any;

    if (this.used < this.pool.length) {
      // Reuse existing node
      node = this.pool[this.used];
      node.type = type;
      Object.assign(node, data);
    } else {
      // Create new node
      node = { type, ...data };
      this.pool.push(node);
    }

    this.used++;
    return node;
  }

  /**
   * Create identifier node
   */
  createIdentifier(name: string): any {
    return this.allocate('identifier', { name });
  }

  /**
   * Create literal node
   */
  createLiteral(value: any, kind: string): any {
    return this.allocate('literal', { value, kind });
  }

  /**
   * Create binary operation node
   */
  createBinaryOp(operator: string, left: any, right: any): any {
    return this.allocate('binary', { operator, left, right });
  }

  /**
   * Create call node
   */
  createCall(callee: any, args: any[]): any {
    return this.allocate('call', { callee, arguments: args });
  }

  /**
   * Reset pool for reuse (important!)
   */
  reset(): void {
    this.used = 0;
  }

  /**
   * Get pool statistics
   */
  getStats(): { poolSize: number; allocated: number; utilization: number } {
    return {
      poolSize: this.pool.length,
      allocated: this.used,
      utilization: this.pool.length > 0 ? (this.used / this.pool.length * 100) : 0
    };
  }
}

/**
 * Parser performance metrics
 */
export class ParserMetrics {
  private startTime: number = 0;
  private parseTime: number = 0;
  private nodeCount: number = 0;
  private precedenceTableHits: number = 0;
  private precedenceTableMisses: number = 0;

  /**
   * Start timing
   */
  start(): void {
    this.startTime = performance.now();
  }

  /**
   * End timing
   */
  end(): void {
    this.parseTime = performance.now() - this.startTime;
  }

  /**
   * Record precedence cache hit
   */
  recordPrecedenceHit(): void {
    this.precedenceTableHits++;
  }

  /**
   * Record precedence cache miss
   */
  recordPrecedenceMiss(): void {
    this.precedenceTableMisses++;
  }

  /**
   * Record node creation
   */
  recordNode(): void {
    this.nodeCount++;
  }

  /**
   * Get metrics
   */
  getMetrics(): {
    parseTime: number;
    nodeCount: number;
    precedenceHitRate: number;
    nodesPerMs: number;
  } {
    const hitRate = this.precedenceTableHits + this.precedenceTableMisses > 0
      ? (this.precedenceTableHits / (this.precedenceTableHits + this.precedenceTableMisses) * 100)
      : 0;

    return {
      parseTime: this.parseTime,
      nodeCount: this.nodeCount,
      precedenceHitRate: hitRate,
      nodesPerMs: this.parseTime > 0 ? this.nodeCount / this.parseTime : 0
    };
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.startTime = 0;
    this.parseTime = 0;
    this.nodeCount = 0;
    this.precedenceTableHits = 0;
    this.precedenceTableMisses = 0;
  }
}
