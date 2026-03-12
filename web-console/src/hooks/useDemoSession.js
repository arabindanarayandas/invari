/**
 * Demo session storage — all data lives in sessionStorage.
 * Cleared when the browser tab is closed. No DB writes.
 */

const KEYS = {
  SPEC: 'demo_spec',
  BASE_URL: 'demo_base_url',
  ENDPOINTS: 'demo_endpoints',
  LOGS: 'demo_logs',
};

const MAX_LOGS = 200;

// ── Spec ──────────────────────────────────────────────────────────────────────

export function getDemoSpec() {
  try {
    const raw = sessionStorage.getItem(KEYS.SPEC);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setDemoSpec(spec) {
  sessionStorage.setItem(KEYS.SPEC, JSON.stringify(spec));
}

// ── Base URL ──────────────────────────────────────────────────────────────────

export function getDemoBaseUrl() {
  return sessionStorage.getItem(KEYS.BASE_URL) || '';
}

export function setDemoBaseUrl(url) {
  sessionStorage.setItem(KEYS.BASE_URL, url);
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

export function getDemoEndpoints() {
  try {
    const raw = sessionStorage.getItem(KEYS.ENDPOINTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setDemoEndpoints(endpoints) {
  sessionStorage.setItem(KEYS.ENDPOINTS, JSON.stringify(endpoints));
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export function getDemoLogs() {
  try {
    const raw = sessionStorage.getItem(KEYS.LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Prepend a new log entry. Trims to MAX_LOGS.
 */
export function addDemoLog(entry) {
  const logs = getDemoLogs();
  const updated = [entry, ...logs].slice(0, MAX_LOGS);
  sessionStorage.setItem(KEYS.LOGS, JSON.stringify(updated));
  return updated;
}

export function clearDemoLogs() {
  sessionStorage.removeItem(KEYS.LOGS);
}

// ── Session check ─────────────────────────────────────────────────────────────

export function hasDemoSession() {
  return !!getDemoSpec() && !!getDemoBaseUrl();
}

export function clearDemoSession() {
  Object.values(KEYS).forEach(k => sessionStorage.removeItem(k));
}
