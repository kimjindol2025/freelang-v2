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

// Re-export all modules (Phase 1)
export * as io from './io';
export * as string from './string';
export * as array from './array';
export * as math from './math';
export * as object from './object';
export * as json from './json';

// Re-export additional modules (Phase 2)
export * as regex from './regex';
export * as date from './date';
export * as set from './set';
export * as map from './map';
export * as encoding from './encoding';

// Re-export Round 1 modules (Phase 3 - Simple Utilities)
export * as uuid from './uuid';
export * as sys from './sys';
export * as fetch from './fetch';
export * as kv from './kv';
export * as temp from './temp';
export * as bench from './bench';
export * as test from './test';
export * as ansicolor from './ansicolor';
export * as stats from './stats';
export * as diff from './diff';
export * as struct from './struct';

// Re-export Round 2 modules (Phase 4 - Data Formats)
export * as xml from './xml';
export * as csv from './csv';
export * as yaml from './yaml';
export * as otp from './otp';

// Re-export Round 4 modules (Phase 5 - Core Infrastructure)
export * as env from './env';
export * as path from './path';
export * as event from './event';
export * as stream from './stream';
export * as url from './url';
export * as validate from './validate';
export * as archive from './archive';
export * as ws from './ws';
export * as grpc from './grpc';

// Re-export Round 3 modules (Phase 6 - System/Network)
export * as proc from './proc';
export * as thread from './thread';
export * as debug from './debug';
export * as reflect from './reflect';
export * as dns from './dns';
export * as udp from './udp';
export * as tls from './tls';
export * as http2 from './http2';

// Re-export Round 5 modules (Phase 7 - Database)
export * as db from './db.sqlite';
export * as fsAdv from './fs-advanced';

// Re-export Robot AI modules (Phase 8 - Embedded Systems & Robotics)
export * as serial from './serial';
export * as robotai from './robotai';

/**
 * Standard Library namespace
 *
 * Provides organized access to all stdlib modules with clear separation of concerns.
 *
 * Phase 1 (6 modules): io, string, array, math, object, json
 * Phase 2 (5 modules): regex, date, set, map, encoding
 *
 * @example
 * import std from "std"
 *
 * // Phase 1 examples
 * std.io.console.log("Hello")
 * std.string.toUpperCase("hello")
 * std.array.map([1, 2, 3], x => x * 2)
 * std.math.sqrt(16)
 * std.object.keys({ a: 1, b: 2 })
 * std.json.stringify({ x: 10 })
 *
 * // Phase 2 examples
 * std.regex.test("hello@example.com", ".*@.*")
 * std.date.format(std.date.now())
 * std.set.union(set1, set2)
 * std.map.create([["a", 1], ["b", 2]])
 * std.encoding.base64Encode("hello")
 */
import * as ioModule from './io';
import * as stringModule from './string';
import * as arrayModule from './array';
import * as mathModule from './math';
import * as objectModule from './object';
import * as jsonModule from './json';
import * as regexModule from './regex';
import * as dateModule from './date';
import * as setModule from './set';
import * as mapModule from './map';
import * as encodingModule from './encoding';
import * as uuidModule from './uuid';
import * as sysModule from './sys';
import * as fetchModule from './fetch';
import * as kvModule from './kv';
import * as tempModule from './temp';
import * as benchModule from './bench';
import * as testModule from './test';
import * as ansicolorModule from './ansicolor';
import * as statsModule from './stats';
import * as diffModule from './diff';
import * as structModule from './struct';
import * as xmlModule from './xml';
import * as csvModule from './csv';
import * as yamlModule from './yaml';
import * as otpModule from './otp';
import * as envModule from './env';
import * as pathModule from './path';
import * as eventModule from './event';
import * as streamModule from './stream';
import * as urlModule from './url';
import * as validateModule from './validate';
import * as archiveModule from './archive';
import * as wsModule from './ws';
import * as grpcModule from './grpc';
import * as procModule from './proc';
import * as threadModule from './thread';
import * as debugModule from './debug';
import * as reflectModule from './reflect';
import * as dnsModule from './dns';
import * as udpModule from './udp';
import * as tlsModule from './tls';
import * as http2Module from './http2';
import * as dbModule from './db.sqlite';
import * as fsAdvModule from './fs-advanced';
import * as serialModule from './serial';
import * as robotaiModule from './robotai';

const std = {
  // Phase 1 modules
  io: ioModule,
  string: stringModule,
  array: arrayModule,
  math: mathModule,
  object: objectModule,
  json: jsonModule,
  // Phase 2 modules
  regex: regexModule,
  date: dateModule,
  set: setModule,
  map: mapModule,
  encoding: encodingModule,
  // Phase 3 modules (Round 1 - Simple Utilities)
  uuid: uuidModule,
  sys: sysModule,
  fetch: fetchModule,
  kv: kvModule,
  temp: tempModule,
  bench: benchModule,
  test: testModule,
  ansicolor: ansicolorModule,
  stats: statsModule,
  diff: diffModule,
  struct: structModule,
  // Phase 4 modules (Round 2 - Data Formats)
  xml: xmlModule,
  csv: csvModule,
  yaml: yamlModule,
  otp: otpModule,
  // Phase 5 modules (Round 4 - Core Infrastructure)
  env: envModule,
  path: pathModule,
  event: eventModule,
  stream: streamModule,
  url: urlModule,
  validate: validateModule,
  archive: archiveModule,
  ws: wsModule,
  grpc: grpcModule,
  // Phase 6 modules (Round 3 - System/Network)
  proc: procModule,
  thread: threadModule,
  debug: debugModule,
  reflect: reflectModule,
  dns: dnsModule,
  udp: udpModule,
  tls: tlsModule,
  http2: http2Module,
  // Phase 7 modules (Round 5 - Database)
  db: dbModule,
  fsAdv: fsAdvModule,
  // Phase 8 modules (Round 6 - Embedded Systems & Robotics)
  serial: serialModule,
  robotai: robotaiModule
};

export default std;
