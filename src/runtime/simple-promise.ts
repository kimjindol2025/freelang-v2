/**
 * FreeLang v2 - Phase J: Simple Promise Implementation
 *
 * A minimal Promise implementation for async/await support
 * Supports:
 * - resolve(value): Resolve with a value
 * - then(callback): Chain callbacks
 * - Promise.resolve(value): Static method
 *
 * Example:
 *   var p = Promise.resolve(42);
 *   p.then(fn(x) -> println(x));  // prints 42
 */

export class SimplePromise {
  private value: any;
  private resolved: boolean = false;
  private callbacks: ((val: any) => void)[] = [];

  constructor(executor?: (resolve: (val: any) => void, reject: (err: any) => void) => void) {
    if (executor) {
      try {
        executor(
          (val: any) => this.resolve(val),
          (err: any) => this.reject(err)
        );
      } catch (err) {
        this.reject(err);
      }
    }
  }

  /**
   * Register a callback to be called when promise resolves
   */
  then(callback: (val: any) => void | SimplePromise): SimplePromise {
    if (this.resolved) {
      // Already resolved - call immediately
      const result = callback(this.value);
      if (result instanceof SimplePromise) {
        return result;
      } else {
        return SimplePromise.resolve(result);
      }
    } else {
      // Not resolved yet - queue callback
      this.callbacks.push((val: any) => {
        const result = callback(val);
        if (result instanceof SimplePromise) {
          return result;
        } else {
          return SimplePromise.resolve(result);
        }
      });
      return this;
    }
  }

  /**
   * Resolve the promise with a value
   */
  resolve(value: any): void {
    if (!this.resolved) {
      this.value = value;
      this.resolved = true;

      // Call all queued callbacks
      for (const callback of this.callbacks) {
        try {
          callback(value);
        } catch (err) {
          console.error('Error in promise callback:', err);
        }
      }
      this.callbacks = [];
    }
  }

  /**
   * Reject the promise with an error
   */
  reject(error: any): void {
    if (!this.resolved) {
      this.value = error;
      this.resolved = true;
      console.error('Promise rejected:', error);
    }
  }

  /**
   * Check if promise is resolved
   */
  isResolved(): boolean {
    return this.resolved;
  }

  /**
   * Get resolved value
   */
  getValue(): any {
    return this.value;
  }

  /**
   * Static method: Create a resolved promise
   */
  static resolve(value: any): SimplePromise {
    const promise = new SimplePromise();
    promise.resolve(value);
    return promise;
  }

  /**
   * Static method: Create a rejected promise
   */
  static reject(error: any): SimplePromise {
    const promise = new SimplePromise();
    promise.reject(error);
    return promise;
  }
}
