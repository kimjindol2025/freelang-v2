/**
 * FreeLang Standard Library: std/url
 *
 * URL parsing and manipulation utilities
 */

import { URL, URLSearchParams } from 'url';

/**
 * Parse URL string
 * @param urlStr URL string
 * @returns URL object
 */
export function parse(urlStr: string): URL {
  return new URL(urlStr);
}

/**
 * Get URL protocol
 * @param urlStr URL string
 * @returns Protocol (http:, https:, etc)
 */
export function getProtocol(urlStr: string): string {
  return new URL(urlStr).protocol;
}

/**
 * Get URL hostname
 * @param urlStr URL string
 * @returns Hostname
 */
export function getHostname(urlStr: string): string {
  return new URL(urlStr).hostname;
}

/**
 * Get URL port
 * @param urlStr URL string
 * @returns Port number or empty string
 */
export function getPort(urlStr: string): string {
  return new URL(urlStr).port;
}

/**
 * Get URL pathname
 * @param urlStr URL string
 * @returns Path name
 */
export function getPathname(urlStr: string): string {
  return new URL(urlStr).pathname;
}

/**
 * Get URL search params
 * @param urlStr URL string
 * @returns Query parameters object
 */
export function getSearchParams(urlStr: string): Record<string, string> {
  const params = new URL(urlStr).searchParams;
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Get URL hash
 * @param urlStr URL string
 * @returns Hash fragment
 */
export function getHash(urlStr: string): string {
  return new URL(urlStr).hash;
}

/**
 * Build URL from components
 * @param protocol Protocol (http:, https:)
 * @param hostname Hostname
 * @param port Port (optional)
 * @param pathname Path (optional)
 * @param search Search string (optional)
 * @param hash Hash (optional)
 * @returns Built URL string
 */
export function build(
  protocol: string,
  hostname: string,
  port?: string,
  pathname?: string,
  search?: string,
  hash?: string
): string {
  let url = `${protocol}//${hostname}`;
  if (port) url += `:${port}`;
  if (pathname) url += pathname;
  if (search) url += search;
  if (hash) url += hash;
  return url;
}

/**
 * Check if string is valid URL
 * @param urlStr String to check
 * @returns true if valid URL
 */
export function isValid(urlStr: string): boolean {
  try {
    new URL(urlStr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Encode URI component
 * @param component Component to encode
 * @returns Encoded component
 */
export function encodeComponent(component: string): string {
  return encodeURIComponent(component);
}

/**
 * Decode URI component
 * @param component Component to decode
 * @returns Decoded component
 */
export function decodeComponent(component: string): string {
  try {
    return decodeURIComponent(component);
  } catch {
    return component;
  }
}

/**
 * Resolve relative URL
 * @param base Base URL
 * @param relative Relative URL
 * @returns Resolved URL string
 */
export function resolve(base: string, relative: string): string {
  return new URL(relative, base).toString();
}
