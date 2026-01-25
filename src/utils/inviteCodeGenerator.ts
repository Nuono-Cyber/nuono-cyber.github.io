/**
 * Utility functions for generating and validating invite codes
 */

/**
 * Generate a random 10-character hexadecimal code
 * @returns A 10-character hexadecimal string
 */
export function generateHexCode(): string {
  const array = new Uint8Array(5);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 10);
}

/**
 * Validate if a string is a valid 10-character hexadecimal code
 * @param code The code to validate
 * @returns True if valid, false otherwise
 */
export function isValidHexCode(code: string): boolean {
  return /^[a-f0-9]{10}$/.test(code.toLowerCase());
}

/**
 * Format a hex code for display (uppercase)
 * @param code The hex code to format
 * @returns Formatted code in uppercase
 */
export function formatHexCode(code: string): string {
  return code.toUpperCase();
}
