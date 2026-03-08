/**
 * FreeLang Standard Library: std/stream
 *
 * Stream utilities for handling data streams
 */

import { createReadStream, createWriteStream } from 'fs';
import { ReadStream, WriteStream } from 'fs';

/**
 * Create read stream from file
 * @param filepath File path
 * @param options Stream options
 * @returns ReadStream
 */
export function createReader(filepath: string, options?: any): ReadStream {
  return createReadStream(filepath, options);
}

/**
 * Create write stream to file
 * @param filepath File path
 * @param options Stream options
 * @returns WriteStream
 */
export function createWriter(filepath: string, options?: any): WriteStream {
  return createWriteStream(filepath, options);
}

/**
 * Read file as stream
 * @param filepath File path
 * @param encoding Encoding (default: utf-8)
 * @returns Promise that resolves to file contents
 */
export async function readStream(filepath: string, encoding: string = 'utf-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filepath, { encoding: encoding as any });
    let data = '';

    stream.on('data', chunk => {
      data += chunk;
    });

    stream.on('end', () => {
      resolve(data);
    });

    stream.on('error', reject);
  });
}

/**
 * Write data to file as stream
 * @param filepath File path
 * @param data Data to write
 * @returns Promise that resolves when complete
 */
export async function writeStream(filepath: string, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createWriteStream(filepath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    stream.write(data);
    stream.end();
  });
}

/**
 * Pipe reader to writer
 * @param readPath Source file path
 * @param writePath Destination file path
 * @returns Promise that resolves when complete
 */
export async function pipe(readPath: string, writePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = createReadStream(readPath);
    const writer = createWriteStream(writePath);

    reader.pipe(writer);

    reader.on('error', reject);
    writer.on('error', reject);
    writer.on('finish', resolve);
  });
}

/**
 * Transform stream data with function
 * @param filepath Source file path
 * @param transformFn Transform function
 * @param outputPath Output file path
 * @returns Promise that resolves when complete
 */
export async function transform(
  filepath: string,
  transformFn: (chunk: string) => string,
  outputPath?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filepath, { encoding: 'utf-8' as any });
    let result = '';
    let output = '';

    stream.on('data', chunk => {
      const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString();
      const transformed = transformFn(chunkStr);
      result += transformed;
      output += transformed;
    });

    stream.on('end', () => {
      if (outputPath) {
        const writer = createWriteStream(outputPath);
        writer.on('finish', () => resolve(result));
        writer.on('error', reject);
        writer.write(output);
        writer.end();
      } else {
        resolve(result);
      }
    });

    stream.on('error', reject);
  });
}

/**
 * Get file size
 * @param filepath File path
 * @returns File size in bytes
 */
export async function getSize(filepath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filepath);
    let size = 0;

    stream.on('data', chunk => {
      size += chunk.length;
    });

    stream.on('end', () => {
      resolve(size);
    });

    stream.on('error', reject);
  });
}
