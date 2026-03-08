/**
 * FreeLang Standard Library: std/ansicolor
 *
 * ANSI color and styling utilities for terminal output
 */

// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const ITALIC = '\x1b[3m';
const UNDERLINE = '\x1b[4m';

// Foreground colors
const BLACK = '\x1b[30m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const WHITE = '\x1b[37m';

// Bright foreground colors
const BRIGHT_BLACK = '\x1b[90m';
const BRIGHT_RED = '\x1b[91m';
const BRIGHT_GREEN = '\x1b[92m';
const BRIGHT_YELLOW = '\x1b[93m';
const BRIGHT_BLUE = '\x1b[94m';
const BRIGHT_MAGENTA = '\x1b[95m';
const BRIGHT_CYAN = '\x1b[96m';
const BRIGHT_WHITE = '\x1b[97m';

// Background colors
const BG_BLACK = '\x1b[40m';
const BG_RED = '\x1b[41m';
const BG_GREEN = '\x1b[42m';
const BG_YELLOW = '\x1b[43m';
const BG_BLUE = '\x1b[44m';
const BG_MAGENTA = '\x1b[45m';
const BG_CYAN = '\x1b[46m';
const BG_WHITE = '\x1b[47m';

/**
 * Strip ANSI color codes from string
 * @param str String with ANSI codes
 * @returns String without ANSI codes
 */
export function strip(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Apply color to text
 * @param text Text to color
 * @param color Color code
 * @returns Colored text
 */
export function color(text: string, color: string): string {
  return color + text + RESET;
}

/**
 * Apply multiple styles to text
 * @param text Text to style
 * @param codes Array of ANSI codes
 * @returns Styled text
 */
export function style(text: string, codes: string[]): string {
  return codes.join('') + text + RESET;
}

// Convenience functions
export function bold(text: string): string { return color(text, BOLD); }
export function dim(text: string): string { return color(text, DIM); }
export function italic(text: string): string { return color(text, ITALIC); }
export function underline(text: string): string { return color(text, UNDERLINE); }

export function black(text: string): string { return color(text, BLACK); }
export function red(text: string): string { return color(text, RED); }
export function green(text: string): string { return color(text, GREEN); }
export function yellow(text: string): string { return color(text, YELLOW); }
export function blue(text: string): string { return color(text, BLUE); }
export function magenta(text: string): string { return color(text, MAGENTA); }
export function cyan(text: string): string { return color(text, CYAN); }
export function white(text: string): string { return color(text, WHITE); }

export function brightRed(text: string): string { return color(text, BRIGHT_RED); }
export function brightGreen(text: string): string { return color(text, BRIGHT_GREEN); }
export function brightYellow(text: string): string { return color(text, BRIGHT_YELLOW); }
export function brightBlue(text: string): string { return color(text, BRIGHT_BLUE); }
export function brightCyan(text: string): string { return color(text, BRIGHT_CYAN); }

export function bgRed(text: string): string { return color(text, BG_RED); }
export function bgGreen(text: string): string { return color(text, BG_GREEN); }
export function bgBlue(text: string): string { return color(text, BG_BLUE); }
export function bgYellow(text: string): string { return color(text, BG_YELLOW); }
export function bgCyan(text: string): string { return color(text, BG_CYAN); }

/**
 * Create error message
 * @param text Message text
 * @returns Error message with red color
 */
export function error(text: string): string {
  return brightRed(text);
}

/**
 * Create success message
 * @param text Message text
 * @returns Success message with green color
 */
export function success(text: string): string {
  return brightGreen(text);
}

/**
 * Create warning message
 * @param text Message text
 * @returns Warning message with yellow color
 */
export function warn(text: string): string {
  return brightYellow(text);
}

/**
 * Create info message
 * @param text Message text
 * @returns Info message with blue color
 */
export function info(text: string): string {
  return brightBlue(text);
}
