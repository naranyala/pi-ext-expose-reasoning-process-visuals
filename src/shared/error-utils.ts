/**
 * Utilities for transforming raw system/tool errors into human-readable formats.
 */

export function beautifyError(error: any): string {
  if (!error) return "An unknown error occurred.";
  
  // Handle case where error is already a string
  if (typeof error === "string") {
    return attemptJsonParse(error) || error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle plain objects (potentially JSON)
  if (typeof error === "object") {
    return attemptJsonParse(JSON.stringify(error));
  }

  return String(error);
}

function attemptJsonParse(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    
    // Common error patterns in JSON responses
    if (typeof parsed === "object" && parsed !== null) {
      // Check for nested messages first
      if (parsed.details && typeof parsed.details === "object" && parsed.details.message) {
        return parsed.details.message;
      }

      return (
        parsed.message || 
        parsed.error || 
        parsed.errorMessage || 
        parsed.detail || 
        Object.values(parsed).find(v => typeof v === "string") || 
        JSON.stringify(parsed)
      );
    }
  } catch {
    // Not valid JSON or parsing failed
  }
  
  return null;
}

/**
 * Formats an error for TUI display with a clean prefix.
 */
export function formatErrorForUI(error: any): string {
  const msg = beautifyError(error);
  return `Error: ${msg}`;
}
