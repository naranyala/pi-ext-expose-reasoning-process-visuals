/**
 * Utility functions for processing diff strings to make them more concise.
 */

export function makeDiffConcise(diff: string): string {
  if (!diff) return diff;
  
  const lines = diff.split("\n");
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Keep changes and already-existing ellipses
    if (line.startsWith("+") || line.startsWith("-") || line.trim() === "...") {
      result.push(line);
      continue;
    }
    
    // Handle context lines (start with space)
    if (line.startsWith(" ")) {
      const prev = lines[i - 1];
      const next = lines[i + 1];
      
      const isPrevChange = prev && (prev.startsWith("+") || prev.startsWith("-"));
      const isNextChange = next && (next.startsWith("+") || next.startsWith("-"));
      
      if (isPrevChange || isNextChange) {
        result.push(line);
      } else {
        // Replace block of context with "  ..." if not already there
        // If it's the first line, we also want to add "  ..." to indicate hidden context
        if (result.length === 0 || !result[result.length - 1].trim().startsWith("...")) {
          result.push("  ...");
        }
      }
    } else {
      // Keep any other lines (e.g. file headers if present)
      result.push(line);
    }
  }
  
  return result.join("\n");
}
