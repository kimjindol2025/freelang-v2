/**
 * FreeLang Standard Library: std/kv
 *
 * Key-value storage utilities
 */

/**
 * Simple in-memory key-value store
 */
export class KVStore {
  private data: Map<string, any> = new Map();
  private expiry: Map<string, number> = new Map();

  /**
   * Set key-value pair
   * @param key Key
   * @param value Value
   * @param ttlMs Optional TTL in milliseconds
   */
  set(key: string, value: any, ttlMs?: number): void {
    this.data.set(key, value);
    if (ttlMs) {
      this.expiry.set(key, Date.now() + ttlMs);
    } else {
      this.expiry.delete(key);
    }
  }

  /**
   * Get value by key
   * @param key Key
   * @returns Value or undefined if not found or expired
   */
  get(key: string): any {
    if (this.isExpired(key)) {
      this.delete(key);
      return undefined;
    }
    return this.data.get(key);
  }

  /**
   * Check if key exists
   * @param key Key
   * @returns true if exists and not expired
   */
  has(key: string): boolean {
    if (this.isExpired(key)) {
      this.delete(key);
      return false;
    }
    return this.data.has(key);
  }

  /**
   * Delete key
   * @param key Key
   */
  delete(key: string): void {
    this.data.delete(key);
    this.expiry.delete(key);
  }

  /**
   * Get all keys
   * @returns Array of keys
   */
  keys(): string[] {
    const result: string[] = [];
    for (const key of this.data.keys()) {
      if (!this.isExpired(key)) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Get all values
   * @returns Array of values
   */
  values(): any[] {
    const result: any[] = [];
    for (const [key, value] of this.data.entries()) {
      if (!this.isExpired(key)) {
        result.push(value);
      }
    }
    return result;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
    this.expiry.clear();
  }

  /**
   * Get store size
   * @returns Number of keys
   */
  size(): number {
    return this.keys().length;
  }

  /**
   * Check if key is expired
   * @param key Key
   * @returns true if expired
   */
  private isExpired(key: string): boolean {
    const exp = this.expiry.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      return true;
    }
    return false;
  }
}

/**
 * Create new KV store
 * @returns New KVStore instance
 */
export function create(): KVStore {
  return new KVStore();
}

/**
 * Create global KV store singleton
 */
let globalStore: KVStore | null = null;

export function getGlobal(): KVStore {
  if (!globalStore) {
    globalStore = new KVStore();
  }
  return globalStore;
}
