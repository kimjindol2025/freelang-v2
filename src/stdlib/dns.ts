/**
 * FreeLang Standard Library: std/dns
 *
 * DNS resolution utilities
 */

import { resolve4, resolve6, resolveMx, resolveTxt, resolveCname, resolveNaptr } from 'dns/promises';

/**
 * Resolve IPv4 addresses
 * @param hostname Hostname to resolve
 * @returns Array of IPv4 addresses
 */
export async function resolveIPv4(hostname: string): Promise<string[]> {
  try {
    return await resolve4(hostname);
  } catch (error) {
    throw new Error(`Failed to resolve IPv4 for ${hostname}`);
  }
}

/**
 * Resolve IPv6 addresses
 * @param hostname Hostname to resolve
 * @returns Array of IPv6 addresses
 */
export async function resolveIPv6(hostname: string): Promise<string[]> {
  try {
    return await resolve6(hostname);
  } catch (error) {
    throw new Error(`Failed to resolve IPv6 for ${hostname}`);
  }
}

/**
 * Resolve MX records
 * @param hostname Domain name
 * @returns Array of MX records
 */
export async function resolveMxRecords(hostname: string): Promise<any[]> {
  try {
    return await resolveMx(hostname);
  } catch (error) {
    throw new Error(`Failed to resolve MX records for ${hostname}`);
  }
}

/**
 * Resolve TXT records
 * @param hostname Domain name
 * @returns Array of TXT records
 */
export async function resolveTxtRecords(hostname: string): Promise<any[]> {
  try {
    return await resolveTxt(hostname);
  } catch (error) {
    throw new Error(`Failed to resolve TXT records for ${hostname}`);
  }
}

/**
 * Resolve CNAME
 * @param hostname Domain name
 * @returns CNAME target
 */
export async function resolveCnameRecord(hostname: string): Promise<string[]> {
  try {
    return await resolveCname(hostname);
  } catch (error) {
    throw new Error(`Failed to resolve CNAME for ${hostname}`);
  }
}

/**
 * Reverse DNS lookup
 * @param address IP address
 * @returns Hostname
 */
export async function reverseLookup(address: string): Promise<string> {
  try {
    const dnsPromises = require('dns/promises');
    return await dnsPromises.reverse(address);
  } catch (error) {
    throw new Error(`Failed to reverse lookup ${address}`);
  }
}

/**
 * Check if hostname is resolvable
 * @param hostname Hostname
 * @returns true if resolvable
 */
export async function isResolvable(hostname: string): Promise<boolean> {
  try {
    await resolve4(hostname);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve any DNS record
 * @param hostname Hostname
 * @param rrtype Record type
 * @returns DNS records
 */
export async function resolveAny(hostname: string, rrtype: string = 'A'): Promise<any[]> {
  try {
    const dnsPromises = require('dns/promises');
    return await dnsPromises.resolve(hostname, rrtype);
  } catch (error) {
    throw new Error(`Failed to resolve ${rrtype} records for ${hostname}`);
  }
}

/**
 * Get DNS server list
 * @returns Array of DNS servers
 */
export function getDnsServers(): string[] {
  try {
    const dns = require('dns');
    return dns.getServers();
  } catch {
    return [];
  }
}

/**
 * Set DNS servers
 * @param servers Array of DNS server addresses
 */
export function setDnsServers(servers: string[]): void {
  try {
    const dns = require('dns');
    dns.setServers(servers);
  } catch {
    // Ignore errors
  }
}
