/**
 * Shared utility functions
 */

/**
 * Format a timestamp for display
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

/**
 * Simple debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Mask sensitive information like API keys
 */
export function maskSensitiveData(text: string): string {
  if (!text) return text;
  const sensitiveKeys = ["api_key", "apikey", "secret", "token", "password", "auth_token", "authorization", "bearer"];
  let masked = text;
  
  for (const key of sensitiveKeys) {
    const regex = new RegExp(`(${key})\\s*[:=\\s]\\s*["']?([^"\\s',]+)["']?`, "gi");
    masked = masked.replace(regex, (match, k, v) => {
      const maskedVal = v.length > 4 ? v.substring(0, 4) + "****" : "****";
      const separator = match.includes('=') ? '=' : (match.includes(':') ? ':' : ' ');
      return `${k}${separator} ${maskedVal}`;
    });
  }
  
  return masked;
}
