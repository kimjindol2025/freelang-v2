/**
 * FreeLang Standard Library: std/struct
 *
 * Struct and object manipulation utilities
 */

/**
 * Deep clone an object
 * @param obj Object to clone
 * @returns Cloned object
 */
export function deepClone(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (obj instanceof Map) {
    const cloned = new Map();
    for (const [key, value] of obj) {
      cloned.set(key, deepClone(value));
    }
    return cloned;
  }

  if (obj instanceof Set) {
    const cloned = new Set();
    for (const value of obj) {
      cloned.add(deepClone(value));
    }
    return cloned;
  }

  const cloned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Merge two objects (shallow merge)
 * @param a First object
 * @param b Second object (overrides a)
 * @returns Merged object
 */
export function merge(a: any, b: any): any {
  return { ...a, ...b };
}

/**
 * Deeply merge two objects
 * @param a First object
 * @param b Second object (overrides a)
 * @returns Merged object
 */
export function deepMerge(a: any, b: any): any {
  const result = { ...a };

  for (const key in b) {
    if (b.hasOwnProperty(key)) {
      if (typeof a[key] === 'object' && typeof b[key] === 'object' && !Array.isArray(a[key])) {
        result[key] = deepMerge(a[key], b[key]);
      } else {
        result[key] = b[key];
      }
    }
  }

  return result;
}

/**
 * Get nested property value
 * @param obj Object
 * @param path Dot-notation path (e.g., "user.profile.name")
 * @returns Property value or undefined
 */
export function getPath(obj: any, path: string): any {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return undefined;
    }
    result = result[key];
  }

  return result;
}

/**
 * Set nested property value
 * @param obj Object
 * @param path Dot-notation path (e.g., "user.profile.name")
 * @param value Value to set
 */
export function setPath(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Check if object has property (supports nested)
 * @param obj Object
 * @param path Dot-notation path
 * @returns true if property exists
 */
export function hasPath(obj: any, path: string): boolean {
  return getPath(obj, path) !== undefined;
}

/**
 * Flatten object to single level
 * @param obj Object
 * @param prefix Optional key prefix
 * @returns Flattened object
 */
export function flatten(obj: any, prefix: string = ''): any {
  const result: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, flatten(value, fullKey));
      } else {
        result[fullKey] = value;
      }
    }
  }

  return result;
}

/**
 * Unflatten flattened object
 * @param obj Flattened object
 * @returns Unflattened object
 */
export function unflatten(obj: any): any {
  const result: any = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      setPath(result, key, obj[key]);
    }
  }

  return result;
}

/**
 * Pick specific properties from object
 * @param obj Object
 * @param keys Keys to pick
 * @returns New object with picked properties
 */
export function pick(obj: any, keys: string[]): any {
  const result: any = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific properties from object
 * @param obj Object
 * @param keys Keys to omit
 * @returns New object without omitted properties
 */
export function omit(obj: any, keys: string[]): any {
  const result: any = {};
  const omitSet = new Set(keys);

  for (const key in obj) {
    if (obj.hasOwnProperty(key) && !omitSet.has(key)) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Check if two objects are deeply equal
 * @param a First object
 * @param b Second object
 * @returns true if equal
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}
