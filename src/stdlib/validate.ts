/**
 * FreeLang Standard Library: std/validate
 *
 * Data validation utilities
 */

/**
 * Validate email address
 * @param email Email to validate
 * @returns true if valid email
 */
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 * @param url URL to validate
 * @returns true if valid URL
 */
export function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate IP address (IPv4)
 * @param ip IP address to validate
 * @returns true if valid IPv4
 */
export function isIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;

  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate IPv6 address
 * @param ip IP address to validate
 * @returns true if valid IPv6
 */
export function isIPv6(ip: string): boolean {
  const ipv6Regex = /^([\da-fA-F]{0,4}:){2,7}[\da-fA-F]{0,4}$/;
  return ipv6Regex.test(ip);
}

/**
 * Validate phone number
 * @param phone Phone number to validate
 * @returns true if valid phone
 */
export function isPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate credit card number
 * @param cardNumber Card number to validate
 * @returns true if valid card
 */
export function isCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate strong password
 * @param password Password to validate
 * @returns true if strong password
 */
export function isStrongPassword(password: string): boolean {
  // At least 8 chars, uppercase, lowercase, digit, special char
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*]/.test(password);
}

/**
 * Validate username
 * @param username Username to validate
 * @returns true if valid username
 */
export function isUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

/**
 * Validate object has required fields
 * @param obj Object to validate
 * @param requiredFields Required field names
 * @returns true if all required fields present
 */
export function hasRequired(obj: any, requiredFields: string[]): boolean {
  return requiredFields.every(field => field in obj && obj[field] !== null && obj[field] !== undefined);
}

/**
 * Validate object fields are of correct types
 * @param obj Object to validate
 * @param schema Schema object with field types
 * @returns true if all fields match schema
 */
export function matchesSchema(obj: any, schema: Record<string, string>): boolean {
  for (const [field, expectedType] of Object.entries(schema)) {
    if (!(field in obj)) return false;
    if (typeof obj[field] !== expectedType) return false;
  }
  return true;
}

/**
 * Validate array length
 * @param arr Array to validate
 * @param minLength Minimum length
 * @param maxLength Maximum length
 * @returns true if valid length
 */
export function isArrayLength(arr: any[], minLength: number, maxLength?: number): boolean {
  if (arr.length < minLength) return false;
  if (maxLength !== undefined && arr.length > maxLength) return false;
  return true;
}

/**
 * Validate string length
 * @param str String to validate
 * @param minLength Minimum length
 * @param maxLength Maximum length
 * @returns true if valid length
 */
export function isStringLength(str: string, minLength: number, maxLength?: number): boolean {
  if (str.length < minLength) return false;
  if (maxLength !== undefined && str.length > maxLength) return false;
  return true;
}
