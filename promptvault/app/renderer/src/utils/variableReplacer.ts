// File: app/renderer/src/utils/variableReplacer.ts
// Utility-Funktionen zum Ersetzen von Platzhaltern in Prompt-Inhalten

/**
 * Ersetzt Platzhalter im Format {{variablenname}} durch die entsprechenden Werte aus global_variables
 * @param content Der Prompt-Inhalt mit Platzhaltern
 * @param globalVariables Die globalen Variablen als Record<string, string> oder JSON string
 * @returns Der Prompt-Inhalt mit ersetzten Variablen
 */
export function replaceVariables(
  content: string,
  globalVariables?: string | Record<string, string>
): string {
  if (!globalVariables) {
    return content;
  }

  // Parse JSON string if needed
  let variables: Record<string, string>;
  if (typeof globalVariables === 'string') {
    try {
      const parsed = JSON.parse(globalVariables);
      variables = typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return content; // Return original content if parsing fails
    }
  } else {
    variables = globalVariables;
  }

  // Replace {{variablenname}} with variable values
  return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? variables[varName] : match;
  });
}

/**
 * Extrahiert alle Platzhalter aus einem Prompt-Inhalt
 * @param content Der Prompt-Inhalt
 * @returns Array von Platzhalter-Namen (ohne {{}})
 */
export function extractPlaceholders(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) {
    return [];
  }
  return matches.map(match => match.replace(/\{\{|\}\}/g, ''));
}

