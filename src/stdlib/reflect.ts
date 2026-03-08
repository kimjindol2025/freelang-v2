/**
 * FreeLang Standard Library: std/reflect
 *
 * Object reflection and introspection utilities
 */

/**
 * Get type of value
 * @param value Value to check
 * @returns Type string
 */
export function typeOf(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (value instanceof Map) return 'map';
  if (value instanceof Set) return 'set';
  return typeof value;
}

/**
 * Check if value is primitive
 * @param value Value to check
 * @returns true if primitive
 */
export function isPrimitive(value: any): boolean {
  const type = typeof value;
  return type !== 'object' || value === null;
}

/**
 * Check if value is object
 * @param value Value to check
 * @returns true if object
 */
export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object';
}

/**
 * Check if value is function
 * @param value Value to check
 * @returns true if function
 */
export function isFunction(value: any): boolean {
  return typeof value === 'function';
}

/**
 * Get object keys
 * @param obj Object to inspect
 * @returns Array of keys
 */
export function keys(obj: any): string[] {
  if (obj === null || obj === undefined) return [];
  return Object.keys(obj);
}

/**
 * Get object values
 * @param obj Object to inspect
 * @returns Array of values
 */
export function values(obj: any): any[] {
  if (obj === null || obj === undefined) return [];
  return Object.values(obj);
}

/**
 * Get object entries
 * @param obj Object to inspect
 * @returns Array of [key, value] pairs
 */
export function entries(obj: any): [string, any][] {
  if (obj === null || obj === undefined) return [];
  return Object.entries(obj);
}

/**
 * Get all properties (enumerable and non-enumerable)
 * @param obj Object to inspect
 * @returns Array of property names
 */
export function getOwnProperties(obj: any): string[] {
  if (obj === null || obj === undefined) return [];
  return Object.getOwnPropertyNames(obj);
}

/**
 * Get property descriptor
 * @param obj Object
 * @param property Property name
 * @returns Property descriptor
 */
export function getPropertyDescriptor(obj: any, property: string): PropertyDescriptor | undefined {
  return Object.getOwnPropertyDescriptor(obj, property);
}

/**
 * Check if object has property
 * @param obj Object
 * @param property Property name
 * @returns true if has property
 */
export function hasProperty(obj: any, property: string): boolean {
  return property in obj;
}

/**
 * Check if object has own property
 * @param obj Object
 * @param property Property name
 * @returns true if has own property
 */
export function hasOwnProperty(obj: any, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, property);
}

/**
 * Get prototype
 * @param obj Object
 * @returns Prototype object
 */
export function getPrototype(obj: any): any {
  return Object.getPrototypeOf(obj);
}

/**
 * Check if object is instance of constructor
 * @param obj Object
 * @param ctor Constructor
 * @returns true if instance
 */
export function isInstanceOf(obj: any, ctor: any): boolean {
  return obj instanceof ctor;
}

/**
 * Get constructor name
 * @param obj Object
 * @returns Constructor name
 */
export function getConstructorName(obj: any): string {
  return obj?.constructor?.name || 'Unknown';
}

/**
 * Get method names
 * @param obj Object
 * @returns Array of method names
 */
export function getMethods(obj: any): string[] {
  if (obj === null || obj === undefined) return [];
  const methods: string[] = [];
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'function') {
      methods.push(key);
    }
  }
  return methods;
}

/**
 * Call method dynamically
 * @param obj Object
 * @param method Method name
 * @param args Arguments
 * @returns Result of method call
 */
export function callMethod(obj: any, method: string, ...args: any[]): any {
  if (typeof obj[method] !== 'function') {
    throw new Error(`Method ${method} not found`);
  }
  return obj[method](...args);
}

/**
 * Get property value
 * @param obj Object
 * @param property Property name
 * @returns Property value
 */
export function getProperty(obj: any, property: string): any {
  return obj?.[property];
}

/**
 * Set property value
 * @param obj Object
 * @param property Property name
 * @param value Value to set
 */
export function setProperty(obj: any, property: string, value: any): void {
  obj[property] = value;
}

/**
 * Delete property
 * @param obj Object
 * @param property Property name
 * @returns true if deleted
 */
export function deleteProperty(obj: any, property: string): boolean {
  try {
    delete obj[property];
    return true;
  } catch {
    return false;
  }
}
