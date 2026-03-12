// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  repairFormat,
  isSupportedFormat,
  SUPPORTED_FORMAT_MAP,
  extractPeriodHour,
} from '../format-repair.utils.js';

// ─── isSupportedFormat ────────────────────────────────────────────────────────

describe('isSupportedFormat', () => {
  it('returns true for "date"', () => {
    expect(isSupportedFormat('date')).toBe(true);
  });

  it('returns true for "date-time"', () => {
    expect(isSupportedFormat('date-time')).toBe(true);
  });

  it('returns true for "time"', () => {
    expect(isSupportedFormat('time')).toBe(true);
  });

  it('returns false for "email"', () => {
    expect(isSupportedFormat('email')).toBe(false);
  });

  it('returns false for "uri"', () => {
    expect(isSupportedFormat('uri')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSupportedFormat('')).toBe(false);
  });

  it('returns false for unknown format', () => {
    expect(isSupportedFormat('uuid')).toBe(false);
  });
});

// ─── SUPPORTED_FORMAT_MAP ─────────────────────────────────────────────────────

describe('SUPPORTED_FORMAT_MAP', () => {
  it('contains all three supported formats', () => {
    expect(SUPPORTED_FORMAT_MAP).toHaveProperty('date');
    expect(SUPPORTED_FORMAT_MAP).toHaveProperty('date-time');
    expect(SUPPORTED_FORMAT_MAP).toHaveProperty('time');
  });
});

// ─── repairFormat — unsupported format ───────────────────────────────────────

describe('repairFormat — unsupported format', () => {
  it('returns null for "email" format', () => {
    expect(repairFormat('test@example.com', 'email')).toBeNull();
  });

  it('returns null for "uri" format', () => {
    expect(repairFormat('https://example.com', 'uri')).toBeNull();
  });

  it('returns null for unknown format', () => {
    expect(repairFormat('anything', 'uuid')).toBeNull();
  });
});

// ─── format: date ─────────────────────────────────────────────────────────────

describe('repairFormat — date', () => {
  describe('already valid — no repair needed', () => {
    it('returns repaired=false for valid YYYY-MM-DD', () => {
      const result = repairFormat('2026-02-16', 'date');
      expect(result).not.toBeNull();
      expect(result!.repaired).toBe(false);
      expect(result!.value).toBe('2026-02-16');
    });

    it('preserves original valid date string', () => {
      const result = repairFormat('2000-01-01', 'date');
      expect(result!.value).toBe('2000-01-01');
      expect(result!.originalValue).toBe('2000-01-01');
    });
  });

  describe('extract date from datetime string', () => {
    it('strips time from ISO 8601 datetime', () => {
      const result = repairFormat('2026-02-16T19:30:00Z', 'date');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('2026-02-16');
    });

    it('strips time from datetime with offset', () => {
      const result = repairFormat('2026-02-16T19:30:00+05:30', 'date');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('2026-02-16');
    });

    it('strips time with milliseconds', () => {
      const result = repairFormat('2026-02-16T19:30:00.000Z', 'date');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('2026-02-16');
    });
  });

  describe('natural language via chrono-node', () => {
    it('parses "Jan 1 2026" to YYYY-MM-DD', () => {
      const result = repairFormat('Jan 1 2026', 'date');
      expect(result).not.toBeNull();
      expect(result!.repaired).toBe(true);
      expect(result!.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result!.value).toBe('2026-01-01');
    });

    it('parses "February 16, 2026"', () => {
      const result = repairFormat('February 16, 2026', 'date');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('2026-02-16');
    });

    it('parses "16 Feb 2026"', () => {
      const result = repairFormat('16 Feb 2026', 'date');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('2026-02-16');
    });
  });

  describe('unparseable values', () => {
    it('returns null for completely invalid string', () => {
      const result = repairFormat('not-a-date-at-all-xyz', 'date');
      expect(result).toBeNull();
    });

    it('returns null for random number string', () => {
      const result = repairFormat('99999', 'date');
      expect(result).toBeNull();
    });
  });

  describe('result metadata', () => {
    it('sets format field to "date"', () => {
      const result = repairFormat('2026-02-16T00:00:00Z', 'date');
      expect(result!.format).toBe('date');
    });

    it('preserves originalValue', () => {
      const input = '2026-02-16T19:30:00Z';
      const result = repairFormat(input, 'date');
      expect(result!.originalValue).toBe(input);
    });
  });
});

// ─── format: date-time ────────────────────────────────────────────────────────

describe('repairFormat — date-time', () => {
  describe('already valid — no repair needed', () => {
    it('returns repaired=false for valid ISO 8601 with Z', () => {
      const result = repairFormat('2026-02-16T19:30:00Z', 'date-time');
      expect(result!.repaired).toBe(false);
      expect(result!.value).toBe('2026-02-16T19:30:00Z');
    });

    it('returns repaired=false for ISO 8601 with offset', () => {
      const result = repairFormat('2026-02-16T19:30:00+05:30', 'date-time');
      expect(result!.repaired).toBe(false);
    });

    it('returns repaired=false for ISO 8601 without seconds', () => {
      const result = repairFormat('2026-02-16T19:30Z', 'date-time');
      expect(result!.repaired).toBe(false);
    });

    it('returns repaired=false for ISO 8601 with milliseconds', () => {
      const result = repairFormat('2026-02-16T19:30:00.000Z', 'date-time');
      expect(result!.repaired).toBe(false);
    });
  });

  describe('promote plain date to datetime', () => {
    it('appends T00:00:00Z to plain YYYY-MM-DD', () => {
      const result = repairFormat('2026-02-16', 'date-time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('2026-02-16T00:00:00Z');
    });

    it('preserves original plain date in originalValue', () => {
      const result = repairFormat('2026-02-16', 'date-time');
      expect(result!.originalValue).toBe('2026-02-16');
    });
  });

  describe('natural language via chrono-node', () => {
    it('parses "Jan 1 2026 at 9am" to ISO 8601', () => {
      const result = repairFormat('Jan 1 2026 at 9am', 'date-time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('parses "February 16 2026 19:30" to ISO 8601', () => {
      const result = repairFormat('February 16 2026 19:30', 'date-time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toMatch(/^2026-02-16T/);
    });

    it(`parses "tomorrow, 4 o'clock" to tomorrow at 4am UTC`, () => {
      const result = repairFormat("tomorrow, 4 o'clock", 'date-time');
      expect(result).not.toBeNull();
      expect(result!.repaired).toBe(true);
      expect(result!.originalValue).toBe("tomorrow, 4 o'clock");
      expect(result!.format).toBe('date-time');
      expect(result!.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify the parsed Date represents tomorrow at 4:00 in local time
      const parsed = new Date(result!.value);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(parsed.getFullYear()).toBe(tomorrow.getFullYear());
      expect(parsed.getMonth()).toBe(tomorrow.getMonth());
      // local hour should be 4 (AM) — use getHours() on a local Date reconstructed from the ISO string
      const localParsed = new Date(result!.value);
      expect(localParsed.getHours()).toBe(4);
    });

    it('parses "March 5 2026 3pm" to a valid ISO datetime on March 5 2026', () => {
      const result = repairFormat('March 5 2026 3pm', 'date-time');
      expect(result!.repaired).toBe(true);
      // chrono-node parses in local time; toISOString() converts to UTC
      // so just verify the resulting string is a valid ISO 8601 datetime for March 5 2026
      const parsed = new Date(result!.value);
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(2); // 0-indexed: 2 = March
      expect(result!.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('unparseable values', () => {
    it('returns null for completely invalid string', () => {
      const result = repairFormat('not-a-datetime-xyz', 'date-time');
      expect(result).toBeNull();
    });
  });

  describe('result metadata', () => {
    it('sets format field to "date-time"', () => {
      const result = repairFormat('2026-02-16', 'date-time');
      expect(result!.format).toBe('date-time');
    });

    it('result value is a valid ISO string', () => {
      const result = repairFormat('2026-02-16', 'date-time');
      expect(() => new Date(result!.value)).not.toThrow();
      expect(new Date(result!.value).toISOString()).toBeTruthy();
    });
  });
});

// ─── format: time ─────────────────────────────────────────────────────────────

describe('repairFormat — time', () => {
  describe('already valid — no repair needed', () => {
    it('returns repaired=false for HH:mm:ss', () => {
      const result = repairFormat('19:30:00', 'time');
      expect(result!.repaired).toBe(false);
      expect(result!.value).toBe('19:30:00');
    });

    it('normalises HH:mm to HH:mm:ss (repaired=true)', () => {
      const result = repairFormat('19:30', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('19:30:00');
    });

    it('normalises midnight 00:00 to 00:00:00', () => {
      const result = repairFormat('00:00', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('00:00:00');
    });
  });

  describe('extract time from datetime string', () => {
    it('extracts HH:mm:ss from ISO 8601 datetime with Z', () => {
      const result = repairFormat('2026-02-16T19:30:00Z', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('19:30:00');
    });

    it('extracts time from datetime with offset', () => {
      const result = repairFormat('2026-02-16T08:15:45+05:30', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('08:15:45');
    });

    it('extracts time from datetime with milliseconds', () => {
      const result = repairFormat('2026-02-16T19:30:00.000Z', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('19:30:00');
    });
  });

  describe('natural language via chrono-node', () => {
    it('parses "3pm" to 15:00:00', () => {
      const result = repairFormat('3pm', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('15:00:00');
    });

    it('parses "9am" to 09:00:00', () => {
      const result = repairFormat('9am', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('09:00:00');
    });

    it('parses "3:30 PM" to 15:30:00', () => {
      const result = repairFormat('3:30 PM', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('15:30:00');
    });

    it('parses "noon" to 12:00:00', () => {
      const result = repairFormat('noon', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('12:00:00');
    });

    it('parses "midnight" to 00:00:00', () => {
      const result = repairFormat('midnight', 'time');
      expect(result!.repaired).toBe(true);
      expect(result!.value).toBe('00:00:00');
    });
  });

  describe('unparseable values', () => {
    it('returns null for completely invalid time string', () => {
      const result = repairFormat('not-a-time-xyz', 'time');
      expect(result).toBeNull();
    });
  });

  describe('result metadata', () => {
    it('sets format field to "time"', () => {
      const result = repairFormat('19:30:00', 'time');
      expect(result!.format).toBe('time');
    });

    it('preserves originalValue', () => {
      const input = '2026-02-16T19:30:00Z';
      const result = repairFormat(input, 'time');
      expect(result!.originalValue).toBe(input);
    });

    it('value always matches HH:mm:ss pattern', () => {
      const result = repairFormat('3pm', 'time');
      expect(result!.value).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });
});

// ─── Dual-Parser: extractPeriodHour ──────────────────────────────────────────

describe('extractPeriodHour', () => {
  it('returns the parsed hour for input containing "morning" (compromise parses holistically)', () => {
    // compromise focuses on the explicit "4" + "morning" context → 4 AM
    const hour = extractPeriodHour('tomorrow 4 in the morning');
    expect(hour).not.toBeNull();
    expect(hour).toBe(4); // 4 AM — correct, morning context preserved
  });

  it('returns 14 for "this afternoon" with no conflicting time number', () => {
    // without an explicit number, compromise resolves afternoon → 14:00
    const hour = extractPeriodHour('this afternoon');
    expect(hour).toBe(14);
  });

  it('returns 18 for full input containing "evening"', () => {
    expect(extractPeriodHour("tomorrow 4 o'clock in the evening")).toBe(18);
  });

  it('returns 20 for full input containing "at night"', () => {
    expect(extractPeriodHour('Feb 16 2026 8 at night')).toBe(20);
  });

  it('returns an hour even when explicit AM/PM given (compromise still parses)', () => {
    const hour = extractPeriodHour('tomorrow at 4pm');
    expect(hour).not.toBeNull();
    expect(hour).toBe(16);
  });

  it('returns null when compromise cannot parse the input', () => {
    expect(extractPeriodHour('not-parseable-xyz-abc')).toBeNull();
  });
});

// ─── Dual-Parser: period context on date-time ─────────────────────────────────

describe('repairFormat — date-time — dual-parser period context', () => {
  it(`resolves "tomorrow 4 o'clock in the evening" to 16:00 local`, () => {
    const result = repairFormat("tomorrow 4 o'clock in the evening", 'date-time');
    expect(result).not.toBeNull();
    expect(result!.repaired).toBe(true);
    // local hour should be 16 (4 PM)
    expect(new Date(result!.value).getHours()).toBe(16);
    // date should be tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(new Date(result!.value).getDate()).toBe(tomorrow.getDate());
  });

  it(`resolves "tomorrow 4 o'clock in the morning" to 04:00 local`, () => {
    const result = repairFormat("tomorrow 4 o'clock in the morning", 'date-time');
    expect(result).not.toBeNull();
    expect(result!.repaired).toBe(true);
    expect(new Date(result!.value).getHours()).toBe(4);
  });

  it('resolves "Feb 16 2026 8 at night" to 20:00', () => {
    const result = repairFormat('Feb 16 2026 8 at night', 'date-time');
    expect(result).not.toBeNull();
    expect(result!.repaired).toBe(true);
    expect(new Date(result!.value).getHours()).toBe(20);
  });

  it('does not override explicit AM/PM (chrono meridiem is certain)', () => {
    // "4pm" — chrono knows meridiem, period context should not override
    const result = repairFormat('tomorrow at 4pm', 'date-time');
    expect(result).not.toBeNull();
    expect(new Date(result!.value).getHours()).toBe(16);
  });
});

// ─── Dual-Parser: relative dates ──────────────────────────────────────────────

describe('repairFormat — date-time — relative date expressions', () => {
  it('parses "next friday at noon" to a Friday at 12:00', () => {
    const result = repairFormat('next friday at noon', 'date-time');
    expect(result).not.toBeNull();
    expect(result!.repaired).toBe(true);
    const parsed = new Date(result!.value);
    expect(parsed.getDay()).toBe(5); // 5 = Friday
    expect(parsed.getHours()).toBe(12);
  });

  it('parses "tonight at 9" to today at 21:00', () => {
    const result = repairFormat('tonight at 9', 'date-time');
    expect(result).not.toBeNull();
    expect(result!.repaired).toBe(true);
    expect(new Date(result!.value).getHours()).toBe(21);
  });
});

// ─── Dual-Parser: typo guard (text coverage) ──────────────────────────────────

describe('repairFormat — typo guard', () => {
  it('returns null for "tommrrow 4pm" (typo — chrono only matched "4pm")', () => {
    expect(repairFormat('tommrrow 4pm', 'date-time')).toBeNull();
  });

  it('returns null for "tommrrow 4pm" in date format too', () => {
    expect(repairFormat('tommrrow 4pm', 'date')).toBeNull();
  });

  it('does NOT reject valid relative dates like "next friday at noon"', () => {
    expect(repairFormat('next friday at noon', 'date-time')).not.toBeNull();
  });

  it('does NOT reject "tomorrow at 4pm"', () => {
    expect(repairFormat('tomorrow at 4pm', 'date-time')).not.toBeNull();
  });
});
