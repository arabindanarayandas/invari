/**
 * Reusable Design System Constants
 * Technical Editorial Design System - Production Ready
 *
 * Usage: Import and use these constants across components for consistency
 * Example: import { TYPOGRAPHY, SPACING, RADIUS } from '../constants/styles';
 */

// Typography Constants - Based on Technical Editorial Design System
export const TYPOGRAPHY = {
  // Page Titles (Main headings)
  pageTitle: 'font-serif text-[26px] font-normal text-on-surface',

  // Section Titles
  sectionTitle: 'font-serif text-[21px] font-normal text-on-surface',
  subsectionTitle: 'font-serif text-[17px] font-normal text-on-surface',

  // Labels (Form labels, metadata labels)
  label: 'font-mono text-[10px] uppercase tracking-[0.1em] text-muted font-semibold',
  labelLarge: 'font-mono text-[11px] uppercase tracking-[0.1em] text-muted font-semibold',

  // Body Text
  bodyText: 'text-[13px] text-on-surface',
  bodyTextMuted: 'text-[13px] text-muted',
  bodySmall: 'text-[12px] text-on-surface',
  bodySmallMuted: 'text-[12px] text-muted',

  // Mono Text (Code, data, numbers)
  monoText: 'font-mono text-[11px] text-muted',
  monoTextNormal: 'font-mono text-[12px] text-on-surface',

  // Tab Navigation
  tabText: 'text-[13px]',
  tabTextActive: 'text-[13px] font-semibold',
};

// Spacing Constants
export const SPACING = {
  // Padding patterns
  headerPadding: 'px-7',
  contentPadding: 'px-7 py-6',
  cardPadding: 'p-6',
  cardPaddingCompact: 'p-4',

  // Margins
  sectionMargin: 'mb-6',
  itemMargin: 'mb-4',

  // Gaps
  flexGapSmall: 'gap-2',
  flexGapMedium: 'gap-3',
  flexGapLarge: 'gap-4',
};

// Border Radius Constants
export const RADIUS = {
  button: 'rounded-[8px]',
  card: 'rounded-[12px]',
  modal: 'rounded-[14px]',
  pill: 'rounded-[100px]',
  input: 'rounded-[8px]',
  badge: 'rounded-[8px]',
};

// Button Styles
export const BUTTONS = {
  primary: 'px-[18px] py-[9px] bg-primary text-white border-0 rounded-[8px] text-[13px] font-medium hover:opacity-88 transition-all',
  secondary: 'px-[18px] py-[9px] bg-transparent border border-outline rounded-[8px] text-[13px] text-on-surface hover:bg-surface-container-high transition-all',
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
};

// Badge/Chip Styles
export const BADGES = {
  // HTTP Method colors (exact hex values from design system)
  methodGet: 'bg-[#dcfce7] text-[#166534]',
  methodPost: 'bg-[#dbeafe] text-[#1d4ed8]',
  methodPut: 'bg-[#fef3c7] text-[#b45309]',
  methodPatch: 'bg-[#fef3c7] text-[#b45309]',
  methodDelete: 'bg-[#fee2e2] text-[#dc2626]',

  // Status colors
  statusSuccess: 'bg-[#d4f0e7] text-[#166534]',
  statusWarning: 'bg-[#fef3c7] text-[#b45309]',
  statusError: 'bg-[#fee2e2] text-[#dc2626]',

  // Base badge style
  base: 'px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-[0.1em] rounded-[8px]',
};

// Form Input Styles
export const INPUTS = {
  base: 'w-full px-[13px] py-[10px] border border-outline-variant rounded-[8px] bg-surface-container-low text-[13px] text-on-surface transition-colors duration-150 focus:border-primary focus:outline-none',
  textarea: 'w-full px-[13px] py-[10px] border border-outline-variant rounded-[8px] bg-surface-container-low text-[13px] text-on-surface transition-colors duration-150 focus:border-primary focus:outline-none resize-none',
};

// Common class combinations
export const COMMON = {
  modalOverlay: 'fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4',
  modalContent: 'bg-surface rounded-[14px] max-w-[500px] w-full max-h-[90vh] overflow-y-auto shadow-2xl',
  cardOutlined: 'bg-surface-container-lowest border border-outline rounded-[12px]',
};

export default {
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  BUTTONS,
  BADGES,
  INPUTS,
  COMMON,
};
