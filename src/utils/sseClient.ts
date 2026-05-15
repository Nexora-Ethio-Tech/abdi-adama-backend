/**
 * sseClient.ts
 *
 * Singleton SSE (Server-Sent Events) client.
 *
 * Connects to /api/events/stream once after login and stays open.
 * Any component can register a callback for specific event types.
 *
 * Usage:
 *   import { connectSSE, onSSEEvent, disconnectSSE } from '../utils/sseClient';
 *
 *   // In App.tsx after login:
 *   connectSSE();
 *
 *   // In a component:
 *   useEffect(() => {
 *     const unsub = onSSEEvent('LOGISTICS_NOTICE', (payload) => {
 *       setNotices(prev => [payload, ...prev]);
 *     });
 *     return unsub; // cleanup on unmount
 *   }, []);
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

type EventCallback = (payload: any) => void;

// Registry: eventName → list of callbacks
const listeners = new Map<string, Set<EventCallback>>();

let eventSource: EventSource | null = null;

/**
 * Open the SSE connection. Call this once after the user logs in.
 * Reads the JWT from sessionStorage (same key as apiClient).
 */
export const connectSSE = (): void => {
  // Already connected
  if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

  const token = sessionStorage.getItem('abdi_adama_token');
  if (!token) {
    console.warn('[SSE] No token found — skipping connection.');
    return;
  }

  const url = `${API_BASE}/api/events/stream?token=${encodeURIComponent(token)}`;
  eventSource = new EventSource(url);

  eventSource.addEventListener('connected', () => {
    console.log('[SSE] Connected to real-time event stream.');
  });

  // Generic handler — dispatches to all registered listeners for this event type
  const handleEvent = (eventName: string) => (e: MessageEvent) => {
    try {
      const payload = JSON.parse(e.data);
      listeners.get(eventName)?.forEach(cb => cb(payload));
    } catch {
      console.warn(`[SSE] Failed to parse ${eventName} payload.`);
    }
  };

  eventSource.addEventListener('LOGISTICS_NOTICE', handleEvent('LOGISTICS_NOTICE'));

  eventSource.onerror = () => {
    console.warn('[SSE] Connection lost — will auto-reconnect via browser.');
    // EventSource auto-reconnects by default; no manual retry needed.
  };
};

/**
 * Close the SSE connection. Call this on logout.
 */
export const disconnectSSE = (): void => {
  eventSource?.close();
  eventSource = null;
  listeners.clear();
  console.log('[SSE] Disconnected.');
};

/**
 * Register a callback for a specific SSE event type.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * @param eventName  e.g. 'LOGISTICS_NOTICE'
 * @param callback   receives the parsed JSON payload
 */
export const onSSEEvent = (eventName: string, callback: EventCallback): (() => void) => {
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  listeners.get(eventName)!.add(callback);

  // Return unsubscribe function
  return () => {
    listeners.get(eventName)?.delete(callback);
  };
};
