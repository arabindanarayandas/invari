/**
 * Sync interval options for OpenAPI schema auto-sync
 */
export const SYNC_INTERVALS = [
  { label: 'Every 15 minutes', value: '15min' },
  { label: 'Every 30 minutes', value: '30min' },
  { label: 'Every hour', value: '1hour' },
  { label: 'Every 6 hours', value: '6hours' },
  { label: 'Every 12 hours', value: '12hours' },
  { label: 'Every 24 hours', value: '24hours' },
];

/**
 * Get human-readable label for a sync interval value
 */
export const getSyncIntervalLabel = (value) => {
  const interval = SYNC_INTERVALS.find(i => i.value === value);
  return interval ? interval.label : value;
};
