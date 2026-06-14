/**
 * In-memory user cache with TTL for the auth middleware.
 *
 * Why: The authenticate middleware queries `SELECT ... FROM users WHERE id = $1`
 * on EVERY API request. For 4K students + 300 teachers + staff, this adds thousands
 * of redundant DB round-trips per minute.
 *
 * This cache stores user rows for a short TTL (30 seconds by default).
 * Any operation that changes a user's status, role, or is_active flag
 * should call `invalidateUserCache(userId)` to force a fresh DB read.
 *
 * Cache characteristics:
 * - Max 2000 entries (LRU-style eviction via periodic sweep)
 * - 30-second TTL — short enough that status changes propagate quickly
 * - Zero external dependencies — pure Map<string, {user, expiry}>
 */

import { User } from '../types';

interface CachedUser {
  user: User;
  expiresAt: number;
}

const TTL_MS = 30_000;        // 30 seconds
const MAX_ENTRIES = 2000;
const SWEEP_INTERVAL = 60_000; // Clean up expired entries every 60s

const cache = new Map<string, CachedUser>();

/**
 * Get a cached user by ID. Returns undefined if not cached or expired.
 */
export function getCachedUser(userId: string): User | undefined {
  const entry = cache.get(userId);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return undefined;
  }

  return entry.user;
}

/**
 * Store a user row in cache.
 */
export function setCachedUser(userId: string, user: User): void {
  // Evict oldest entries if at capacity
  if (cache.size >= MAX_ENTRIES && !cache.has(userId)) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }

  cache.set(userId, {
    user,
    expiresAt: Date.now() + TTL_MS,
  });
}

/**
 * Invalidate a specific user's cache entry.
 * Call this whenever a user's status, role, is_active, or branch changes.
 */
export function invalidateUserCache(userId: string): void {
  cache.delete(userId);
}

/**
 * Clear the entire user cache.
 */
export function clearUserCache(): void {
  cache.clear();
}

// Periodic sweep to prevent memory leaks from expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}, SWEEP_INTERVAL);
