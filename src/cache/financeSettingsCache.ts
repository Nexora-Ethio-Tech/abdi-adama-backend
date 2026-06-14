/**
 * In-memory cache for finance_settings table.
 *
 * Why: The finance_settings table is tiny (< 20 rows) but queried dozens of times
 * per financial operation via getFinanceSettingNumber(). Each call to
 * computeMonthlyFeesOutstanding, getPenaltyDue, getRegistrationDueForMonth
 * triggers individual SELECT queries for the same handful of keys.
 *
 * This cache loads all settings once and refreshes every 60 seconds,
 * reducing hundreds of redundant DB queries to ~1 per minute.
 */

import pool from '../config/database';

interface SettingsCache {
  data: Map<string, string>;
  loadedAt: number;
}

const TTL_MS = 60_000; // 60 seconds — settings rarely change
let cache: SettingsCache | null = null;

/**
 * Load all finance settings into memory. Called lazily on first access
 * and refreshed after TTL expires.
 */
async function ensureLoaded(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < TTL_MS) {
    return cache.data;
  }

  const result = await pool.query(`SELECT key, value FROM finance_settings`);
  const map = new Map<string, string>();
  for (const row of result.rows) {
    map.set(row.key, row.value);
  }

  cache = { data: map, loadedAt: now };
  return map;
}

/**
 * Get a finance setting by key with a default fallback.
 * Drop-in replacement for the per-query getFinanceSettingNumber pattern.
 */
export async function getCachedFinanceSetting(key: string, defaultValue = 0): Promise<number> {
  const settings = await ensureLoaded();
  const raw = settings.get(key);
  if (raw === undefined) return defaultValue;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

/**
 * Invalidate the finance settings cache.
 * Call this whenever finance settings are updated via the admin panel.
 */
export function invalidateFinanceSettingsCache(): void {
  cache = null;
}
