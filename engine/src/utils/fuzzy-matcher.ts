/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],    // deletion
          dp[i][j - 1],    // insertion
          dp[i - 1][j - 1] // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Convert string to different naming conventions
 */
function toCamelCase(str: string): string {
  return str.replace(/[_-](.)/g, (_, char) => char.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

/**
 * Common abbreviation mappings
 */
const abbreviationMap: Record<string, string[]> = {
  'usr': ['user'],
  'pwd': ['password'],
  'addr': ['address'],
  'amt': ['amount'],
  'qty': ['quantity'],
  'desc': ['description'],
  'msg': ['message'],
  'num': ['number'],
  'str': ['string'],
  'curr': ['currency'],
  'req': ['request', 'required'],
  'res': ['response', 'result'],
  'auth': ['authentication', 'authorization'],
  'config': ['configuration'],
  'id': ['identifier', 'identity'],
};

/**
 * Find the best matching field name from a list of expected fields
 * @param provided - The field name provided by the AI agent
 * @param expected - Array of expected field names from schema
 * @param threshold - Maximum Levenshtein distance to consider a match (default: 2)
 * @returns The matched field name or null if no good match found
 */
export function matchFieldName(
  provided: string,
  expected: string[],
  threshold: number = 2
): { match: string; confidence: number } | null {
  const providedLower = provided.toLowerCase();

  // Exact match
  const exactMatch = expected.find(e => e.toLowerCase() === providedLower);
  if (exactMatch) {
    return { match: exactMatch, confidence: 1.0 };
  }

  // Try different naming conventions
  const variants = [
    provided,
    toCamelCase(provided),
    toSnakeCase(provided),
    toKebabCase(provided),
  ];

  for (const variant of variants) {
    const match = expected.find(e => e.toLowerCase() === variant.toLowerCase());
    if (match) {
      return { match, confidence: 0.99 };
    }
  }

  // Check abbreviation expansions
  const providedParts = providedLower.split(/[_-]/);
  const expandedVariants: string[] = [];

  providedParts.forEach((part, i) => {
    if (abbreviationMap[part]) {
      abbreviationMap[part].forEach(expansion => {
        const expandedParts = [...providedParts];
        expandedParts[i] = expansion;
        expandedVariants.push(expandedParts.join('_'));
        expandedVariants.push(toCamelCase(expandedParts.join('_')));
      });
    }
  });

  for (const variant of expandedVariants) {
    const match = expected.find(e => e.toLowerCase() === variant.toLowerCase());
    if (match) {
      return { match, confidence: 0.99 };
    }
  }

  // Levenshtein distance matching
  let bestMatch: { match: string; distance: number } | null = null;

  for (const expectedField of expected) {
    const distance = levenshteinDistance(providedLower, expectedField.toLowerCase());

    if (distance <= threshold) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { match: expectedField, distance };
      }
    }
  }

  if (bestMatch) {
    // Calculate confidence based on distance (closer = higher confidence)
    const confidence = Math.max(0, 1 - (bestMatch.distance / threshold));
    return { match: bestMatch.match, confidence };
  }

  return null;
}

/**
 * Find all potential field matches in a schema
 */
export function findAllFieldMatches(
  providedFields: string[],
  schemaFields: string[]
): Map<string, { match: string; confidence: number }> {
  const matches = new Map<string, { match: string; confidence: number }>();

  for (const providedField of providedFields) {
    const match = matchFieldName(providedField, schemaFields);
    if (match) {
      matches.set(providedField, match);
    }
  }

  return matches;
}
