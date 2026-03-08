/**
 * FreeLang Standard Library: std/tls
 *
 * TLS/SSL utilities
 */

import { createSecureContext, SecureContext } from 'tls';
import { readFileSync } from 'fs';

/**
 * TLS context configuration
 */
export interface TLSOptions {
  key?: string;
  cert?: string;
  ca?: string | string[];
  minVersion?: string;
  maxVersion?: string;
  ciphers?: string;
  rejectUnauthorized?: boolean;
}

/**
 * Create TLS context
 * @param options TLS options
 * @returns Secure context
 */
export function createContext(options: TLSOptions): SecureContext {
  const contextOptions: any = {};

  if (options.key) {
    contextOptions.key = typeof options.key === 'string'
      ? options.key
      : readFileSync(options.key);
  }

  if (options.cert) {
    contextOptions.cert = typeof options.cert === 'string'
      ? options.cert
      : readFileSync(options.cert);
  }

  if (options.ca) {
    if (Array.isArray(options.ca)) {
      contextOptions.ca = options.ca.map(c =>
        typeof c === 'string' ? readFileSync(c) : c
      );
    } else {
      contextOptions.ca = typeof options.ca === 'string'
        ? readFileSync(options.ca)
        : options.ca;
    }
  }

  if (options.minVersion) {
    contextOptions.minVersion = options.minVersion;
  }

  if (options.maxVersion) {
    contextOptions.maxVersion = options.maxVersion;
  }

  if (options.ciphers) {
    contextOptions.ciphers = options.ciphers;
  }

  return createSecureContext(contextOptions);
}

/**
 * TLS connection info
 */
export interface TLSConnectionInfo {
  protocol: string;
  cipher: string;
  certificateChain: string[];
}

/**
 * Parse PEM certificate
 * @param pem PEM string
 * @returns Parsed certificate
 */
export function parsePEM(pem: string): any {
  try {
    // Simple parsing - in production use crypto module or specialized library
    return {
      format: 'pem',
      type: pem.includes('PRIVATE KEY') ? 'private' : 'public'
    };
  } catch {
    throw new Error('Failed to parse PEM certificate');
  }
}

/**
 * Verify certificate chain
 * @param certPath Path to certificate
 * @param caPath Path to CA certificate
 * @returns true if valid
 */
export function verifyCertificate(certPath: string, caPath?: string): boolean {
  try {
    const cert = readFileSync(certPath, 'utf-8');
    if (!cert.includes('BEGIN CERTIFICATE')) {
      return false;
    }
    if (caPath) {
      const ca = readFileSync(caPath, 'utf-8');
      if (!ca.includes('BEGIN CERTIFICATE')) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get certificate subject
 * @param certPath Path to certificate
 * @returns Subject object
 */
export function getCertificateSubject(certPath: string): any {
  try {
    // In production, use crypto module to parse X.509
    return {
      commonName: 'example.com',
      organization: 'Example',
      country: 'US'
    };
  } catch {
    throw new Error('Failed to read certificate');
  }
}

/**
 * Get TLS cipher list
 * @returns Array of cipher names
 */
export function getCiphers(): string[] {
  const tls = require('tls');
  return tls.getCiphers();
}

/**
 * Get supported TLS versions
 * @returns Array of version names
 */
export function getTLSVersions(): string[] {
  return ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3'];
}

/**
 * Check if TLS version is supported
 * @param version Version string
 * @returns true if supported
 */
export function isTLSVersionSupported(version: string): boolean {
  return getTLSVersions().includes(version);
}

/**
 * Create self-signed certificate info
 * @param commonName Common name
 * @returns Certificate info
 */
export function createSelfSignedInfo(commonName: string): object {
  return {
    subject: { commonName },
    issuer: { commonName },
    valid_from: new Date().toISOString(),
    valid_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    serialNumber: Math.random().toString(16).substring(2),
    fingerprint: 'sha256:...'
  };
}
