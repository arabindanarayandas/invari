/**
 * Security service for detecting malicious patterns in request data
 */

export interface SecurityThreat {
  field: string;
  value: any;
  threatType: 'sql_injection' | 'command_injection' | 'path_traversal' | 'xss' | 'nosql_injection';
  pattern: string;
  severity: 'high' | 'medium' | 'low';
}

export class SecurityService {
  // SQL Injection patterns
  // More precise patterns that require SQL syntax indicators (quotes, operators, etc.)
  private sqlInjectionPatterns = [
    // SQL keywords with quotes or operators (strong indicators)
    /['"].*?(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE).*?['";]/gi,
    // SQL comment markers
    /--[^\n]*/g,
    /\/\*.*?\*\//g,
    // OR/AND with comparison operators (classic SQL injection)
    /['"]?\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi, // OR 1=1, AND 1=1
    /['"]?\s*(OR|AND)\s+['"][a-z0-9]+['"]\s*=\s*['"][a-z0-9]+/gi, // OR 'a'='a'
    // Statement chaining with semicolons
    /;\s*(DROP|DELETE|UPDATE|INSERT|SELECT)\s+(TABLE|FROM|INTO)/gi,
    // UNION-based injection
    /UNION\s+(ALL\s+)?SELECT/gi,
    // Quote-based injection
    /'\s*(OR|AND)\s*'[^']*'\s*=\s*'/gi,
    /"\s*(OR|AND)\s*"[^"]*"\s*=\s*"/gi,
  ];

  // Command Injection patterns
  private commandInjectionPatterns = [
    /(\||&|;|\n|\r)\s*(ls|cat|rm|mv|cp|chmod|chown|wget|curl|nc|netcat|bash|sh|python|perl|ruby|php)/gi,
    /(^|\s)(rm\s+-rf|sudo|su\s+)/gi,
    /`[^`]*`/g, // Backticks for command substitution
    /\$\([^)]*\)/g, // $() command substitution
    /(&&|\|\|)\s*(rm|cat|ls|wget|curl)/gi,
    />\s*\/dev\/null/gi,
    /2>&1/g,
    /(^|;|\||&)\s*rm\s+-rf\s*\//gi, // Destructive commands
  ];

  // Path Traversal patterns
  private pathTraversalPatterns = [
    /\.\.[\/\\]/g, // ../ or ..\
    /\.\.[\/\\]\.\.[\/\\]/g, // ../../
    /%2e%2e[\/\\]/gi, // URL encoded ..
    /\.\.%2f/gi,
    /\.\.%5c/gi,
  ];

  // XSS patterns
  private xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<iframe[^>]*>/gi,
    /javascript:/gi,
    /on(load|error|click|mouseover|submit)\s*=/gi,
    /<img[^>]*on(error|load)/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ];

  // NoSQL Injection patterns (for string scanning)
  private nosqlInjectionPatterns = [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$regex/gi,
    /\{\s*\$ne\s*:\s*null\s*\}/gi,
    /\{\s*\$gt\s*:\s*['"]\s*['"]\s*\}/gi,
  ];

  // NoSQL operators to detect in object keys
  private nosqlOperators = [
    '$where', '$ne', '$gt', '$gte', '$lt', '$lte',
    '$in', '$nin', '$regex', '$exists', '$type',
    '$expr', '$jsonSchema', '$mod', '$text', '$all',
  ];

  /**
   * Scan request body for malicious patterns
   */
  scanRequestBody(body: any): SecurityThreat[] {
    const threats: SecurityThreat[] = [];

    // Recursively scan all fields
    this.scanObject(body, '', threats);

    return threats;
  }

  /**
   * Recursively scan object for malicious patterns
   */
  private scanObject(obj: any, path: string, threats: SecurityThreat[]): void {
    if (obj === null || obj === undefined) {
      return;
    }

    // If it's a string, scan for patterns
    if (typeof obj === 'string') {
      this.scanString(path, obj, threats);
      return;
    }

    // If it's an array, scan each element
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.scanObject(item, `${path}[${index}]`, threats);
      });
      return;
    }

    // If it's an object, check for NoSQL injection operators and scan properties
    if (typeof obj === 'object') {
      // Check for NoSQL injection operators in object keys
      Object.keys(obj).forEach((key) => {
        // Detect NoSQL operators
        if (key.startsWith('$') && this.nosqlOperators.includes(key)) {
          threats.push({
            field: path || 'root',
            value: JSON.stringify(obj),
            threatType: 'nosql_injection',
            pattern: key,
            severity: 'high',
          });
        }

        const fieldPath = path ? `${path}.${key}` : key;
        this.scanObject(obj[key], fieldPath, threats);
      });
    }
  }

  /**
   * Scan a string value for malicious patterns
   */
  private scanString(field: string, value: string, threats: SecurityThreat[]): void {
    // SQL Injection detection
    for (const pattern of this.sqlInjectionPatterns) {
      const match = value.match(pattern);
      if (match) {
        threats.push({
          field,
          value,
          threatType: 'sql_injection',
          pattern: match[0],
          severity: this.getSQLInjectionSeverity(value), // Check full value, not just matched pattern
        });
        break; // Only report once per field
      }
    }

    // Command Injection detection
    for (const pattern of this.commandInjectionPatterns) {
      const match = value.match(pattern);
      if (match) {
        threats.push({
          field,
          value,
          threatType: 'command_injection',
          pattern: match[0],
          severity: this.getCommandInjectionSeverity(value), // Check full value, not just matched pattern
        });
        break;
      }
    }

    // Path Traversal detection
    for (const pattern of this.pathTraversalPatterns) {
      const match = value.match(pattern);
      if (match) {
        threats.push({
          field,
          value,
          threatType: 'path_traversal',
          pattern: match[0],
          severity: 'high',
        });
        break;
      }
    }

    // XSS detection
    for (const pattern of this.xssPatterns) {
      const match = value.match(pattern);
      if (match) {
        threats.push({
          field,
          value,
          threatType: 'xss',
          pattern: match[0],
          severity: 'medium',
        });
        break;
      }
    }

    // NoSQL Injection detection
    for (const pattern of this.nosqlInjectionPatterns) {
      const match = value.match(pattern);
      if (match) {
        threats.push({
          field,
          value,
          threatType: 'nosql_injection',
          pattern: match[0],
          severity: 'high',
        });
        break;
      }
    }
  }

  /**
   * Determine SQL injection severity
   */
  private getSQLInjectionSeverity(pattern: string): 'high' | 'medium' | 'low' {
    const upperPattern = pattern.toUpperCase();
    const destructiveKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'EXEC', 'EXECUTE'];

    // Check for destructive keywords
    if (destructiveKeywords.some(kw => upperPattern.includes(kw))) {
      return 'high';
    }

    // UNION-based injection is high severity (data exfiltration)
    if (upperPattern.includes('UNION') && upperPattern.includes('SELECT')) {
      return 'high';
    }

    // Just SELECT alone is medium (read-only)
    if (upperPattern.includes('SELECT')) {
      return 'medium';
    }

    return 'medium';
  }

  /**
   * Determine command injection severity
   */
  private getCommandInjectionSeverity(pattern: string): 'high' | 'medium' | 'low' {
    // ALL command injection is high severity by default
    // Even "harmless" commands like cat, ls, whoami can leak sensitive information
    // Examples: cat /etc/passwd, ls /root, whoami, env
    return 'high';
  }

  /**
   * Check if threats contain high severity issues
   */
  hasHighSeverityThreats(threats: SecurityThreat[]): boolean {
    return threats.some(threat => threat.severity === 'high');
  }

  /**
   * Format threats for logging
   */
  formatThreats(threats: SecurityThreat[]): string {
    return threats.map(threat =>
      `${threat.threatType.toUpperCase()} in field "${threat.field}": detected pattern "${threat.pattern}" (severity: ${threat.severity})`
    ).join('; ');
  }
}

export const securityService = new SecurityService();
