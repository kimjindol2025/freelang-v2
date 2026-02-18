/**
 * FreeLang Standard Library: Aggregated Exports
 *
 * Provides unified access to all standard library modules.
 *
 * Usage:
 *   import { io, string, array, math, object, json } from "std"
 *   import { console, file } from "std/io"
 *   import { map, filter } from "std/array"
 */

// Re-export all modules
export * as io from './io';
export * as string from './string';
export * as array from './array';
export * as math from './math';
export * as object from './object';
export * as json from './json';

// For backward compatibility, also export default objects
export { io, console, file, dir, path_ops, input, readLines } from './io';
export { string, toUpperCase, toLowerCase, trim, trimStart, trimEnd, split, join, replace, replaceAll, startsWith, endsWith, includes, substring, indexOf, lastIndexOf, charAt, charCodeAt, repeat, capitalize, capitalizeWords, reverse, camelCase, snakeCase, pascalCase, kebabCase, padStart, padEnd, format, length, similarity } from './string';
export { array, map, filter, reduce, forEach, find, findIndex, some, every, sort, reverse, slice, splice, push, pop, shift, unshift, includes, indexOf, lastIndexOf, join, concat, flatten, unique, uniqueBy, groupBy, length, at, fill, range, repeat, transpose, zip, sum, average, min, max } from './array';
export { math, PI, E, LN2, LN10, LOG2E, LOG10E, SQRT1_2, SQRT2, abs, round, floor, ceil, trunc, sign, pow, sqrt, cbrt, exp, log, log10, log2, sin, cos, tan, asin, acos, atan, atan2, sinh, cosh, tanh, min, max, clamp, lerp, toRadians, toDegrees, random, randomInt, factorial, permutations, combinations, gcd, lcm, isPrime, isEven, isOdd } from './math';
export { object, keys, values, entries, has, get, set, deleteProperty, isEmpty, length, assign, clone, deepClone, mapValues, filterKeys, pick, omit, invert, groupBy, toArray, fromArray, getDeep, setDeep, deepEqual } from './object';
export { json, stringify, parse, prettify, minify, isValid, merge, schema, validate } from './json';

/**
 * Standard Library namespace
 *
 * Provides organized access to all stdlib modules with clear separation of concerns.
 *
 * @example
 * import std from "std"
 *
 * std.io.console.log("Hello")
 * std.string.toUpperCase("hello")
 * std.array.map([1, 2, 3], x => x * 2)
 * std.math.sqrt(16)
 * std.object.keys({ a: 1, b: 2 })
 * std.json.stringify({ x: 10 })
 */
import * as ioModule from './io';
import * as stringModule from './string';
import * as arrayModule from './array';
import * as mathModule from './math';
import * as objectModule from './object';
import * as jsonModule from './json';

const std = {
  io: ioModule,
  string: stringModule,
  array: arrayModule,
  math: mathModule,
  object: objectModule,
  json: jsonModule
};

export default std;
