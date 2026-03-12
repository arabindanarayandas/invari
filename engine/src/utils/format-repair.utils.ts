/**
 * Format Repair Utilities
 * Handles coercion of string values to match OpenAPI format constraints.
 * Currently supports: date, date-time, time
 *
 * Uses a dual-parser strategy:
 *   1. chrono-node  — parses date/time structure
 *   2. compromise   — extracts time-period semantics (morning/afternoon/evening/night)
 *      to correctly resolve ambiguous hours like "4 o'clock in the evening" → 16:00
 */

import * as chrono from 'chrono-node';
import type { ParsedResult } from 'chrono-node';
import nlp from 'compromise';
import compromiseDates from 'compromise-dates';

nlp.extend(compromiseDates);

export type SupportedFormat = 'date' | 'date-time' | 'time';

export interface FormatRepairResult {
  repaired: boolean;
  value: string;
  originalValue: string;
  format: SupportedFormat;
}

// Map of supported formats — use this to check if a format is handled
export const SUPPORTED_FORMAT_MAP: Record<SupportedFormat, true> = {
  'date': true,
  'date-time': true,
  'time': true,
};

/**
 * Check if a format is supported by this repair util
 */
export function isSupportedFormat(format: string): format is SupportedFormat {
  return format in SUPPORTED_FORMAT_MAP;
}

/**
 * Main entry point — attempt to repair a string value to match the given format.
 * Returns null if format is not supported or value cannot be parsed.
 */
export function repairFormat(value: string, format: string): FormatRepairResult | null {
  if (!isSupportedFormat(format)) return null;

  switch (format) {
    case 'date':
      return repairDate(value);
    case 'date-time':
      return repairDateTime(value);
    case 'time':
      return repairTime(value);
  }
}

// ─── Format Handlers ─────────────────────────────────────────────────────────

/**
 * Repair to `date` format: YYYY-MM-DD
 */
function repairDate(value: string): FormatRepairResult | null {
  // Already valid ISO date — pass through
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { repaired: false, value, originalValue: value, format: 'date' };
  }

  // Full datetime string — strip the time part
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const datePart = value.slice(0, 10);
    return { repaired: true, value: datePart, originalValue: value, format: 'date' };
  }

  // Natural language — dual-parser
  const results = chrono.parse(value);
  if (!results.length) return null;

  const result = results[0];

  // Reject if chrono only matched a small fragment (e.g. typo "tommrrow" → only "4pm" matched)
  if (!isChronoResultMeaningful(result, value)) return null;

  const repaired = toISODate(result.start.date());
  return { repaired: true, value: repaired, originalValue: value, format: 'date' };
}

/**
 * Repair to `date-time` format: ISO 8601 UTC
 * Handles "tomorrow 4 o'clock in the evening", "next friday at noon", etc.
 */
function repairDateTime(value: string): FormatRepairResult | null {
  // Already valid ISO 8601 datetime — pass through
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    return { repaired: false, value, originalValue: value, format: 'date-time' };
  }

  // Plain date string — promote to midnight UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const repaired = `${value}T00:00:00Z`;
    return { repaired: true, value: repaired, originalValue: value, format: 'date-time' };
  }

  // Natural language — dual-parser
  const results = chrono.parse(value);
  if (!results.length) return null;

  const result = results[0];

  // Reject if chrono only matched a fragment (typo guard)
  if (!isChronoResultMeaningful(result, value)) return null;

  // Require an explicit time in the input
  if (!result.start.isCertain('hour')) return null;

  // Apply time-period context from compromise (evening/morning/afternoon/night)
  const periodHour = extractPeriodHour(value);
  applyPeriodToResult(result, periodHour);

  const repaired = result.start.date().toISOString();
  return { repaired: true, value: repaired, originalValue: value, format: 'date-time' };
}

/**
 * Repair to `time` format: HH:mm:ss
 * Handles "3pm", "9 in the evening", "noon", datetime strings, etc.
 */
function repairTime(value: string): FormatRepairResult | null {
  // Already valid HH:mm or HH:mm:ss — normalise to HH:mm:ss
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const repaired = value.length === 5 ? `${value}:00` : value;
    return { repaired: repaired !== value, value: repaired, originalValue: value, format: 'time' };
  }

  // Full ISO datetime — extract the time part
  if (/^\d{4}-\d{2}-\d{2}T(\d{2}:\d{2}:\d{2})/.test(value)) {
    const match = value.match(/T(\d{2}:\d{2}:\d{2})/);
    if (match) {
      return { repaired: true, value: match[1], originalValue: value, format: 'time' };
    }
  }

  // Natural language — dual-parser
  const results = chrono.parse(value);
  if (!results.length) return null;

  const result = results[0];

  // Require an explicit time mention
  if (!result.start.isCertain('hour')) return null;

  // Apply time-period context
  const periodHour = extractPeriodHour(value);
  applyPeriodToResult(result, periodHour);

  const repaired = toISOTime(result.start.date());
  return { repaired: true, value: repaired, originalValue: value, format: 'time' };
}

// ─── Dual-Parser Helpers ──────────────────────────────────────────────────────

/**
 * Extract a time-of-day hour from the full input using compromise's NLP understanding.
 * compromise parses the whole sentence holistically — it understands context phrases
 * like "in the evening", "at night", "in the morning" without any hardcoded word lists.
 *
 * Returns the hour (0-23) from compromise's parsed result, or null if compromise
 * could not extract a time from the input.
 */
export function extractPeriodHour(input: string): number | null {
  const results = (nlp as any)(input).dates().get();
  if (!results.length) return null;
  return new Date(results[0].start).getHours();
}

/**
 * Apply period hour context to a chrono ParsedResult.
 * Only modifies the result if meridiem is uncertain (chrono couldn't determine AM/PM).
 *
 * e.g. chrono parsed "4 o'clock" as hour=4, meridiem=uncertain
 *      periodHour=18 (evening) → assign hour=16, meridiem=PM
 */
function applyPeriodToResult(result: ParsedResult, periodHour: number | null): void {
  if (periodHour === null) return;
  if (result.start.isCertain('meridiem')) return; // chrono already knows AM/PM

  const isPM = periodHour >= 12;
  const currentHour = result.start.get('hour');

  if (currentHour === null) return;

  if (isPM && currentHour < 12) {
    (result.start as any).assign('hour', currentHour + 12);
  } else if (!isPM && currentHour === 12) {
    (result.start as any).assign('hour', 0);
  }

  (result.start as any).assign('meridiem', isPM ? 1 : 0);
}

/**
 * Validate that chrono's matched text covers a meaningful portion of the input.
 *
 * This is the typo guard: if chrono only matched a small fragment
 * (e.g. "4pm" from "tommrrow 4pm"), the date reference was not parsed.
 * If it matched most of the input (e.g. "next friday at noon"), it's valid.
 *
 * Threshold: matched text must be ≥50% of the trimmed input length.
 */
function isChronoResultMeaningful(result: ParsedResult, input: string): boolean {
  const inputLength = input.trim().length;
  const matchLength = result.text.length;
  return matchLength / inputLength >= 0.5;
}

// ─── Format Helpers ───────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Format a Date as YYYY-MM-DD using local time */
function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Format a Date as HH:mm:ss using local time */
function toISOTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
