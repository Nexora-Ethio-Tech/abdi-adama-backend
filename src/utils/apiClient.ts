/**
 * apiClient.ts
 *
 * Centralized fetch wrapper that automatically attaches the
 * Authorization: Bearer <token> header from localStorage on every request.
 *
 * Usage:
 *   import { apiFetch } from '../utils/apiClient';
 *   const res = await apiFetch('/api/student/grades?semester=2');
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export const apiFetch = async (
  path: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = localStorage.getItem('abdi_adama_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
};

/**
 * Helper: parse JSON or throw with status context.
 */
export const apiFetchJson = async <T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T; ok: true } | { error: string; ok: false }> => {
  try {
    const res = await apiFetch(path, options);
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.message || json.error || `HTTP ${res.status}` };
    }
    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
};
