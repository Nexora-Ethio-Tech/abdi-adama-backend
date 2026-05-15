import { Response } from 'express';

/**
 * SSE (Server-Sent Events) Manager
 *
 * Maintains a registry of all active SSE connections.
 * When the driver posts a logistics notice, `broadcast()` is called
 * and every connected client receives the event instantly.
 *
 * No Redis, no WebSockets — just a plain in-memory Set<Response>.
 * This is sufficient for a single-process Node.js server.
 */

const clients = new Set<Response>();

/**
 * Register a new SSE client connection.
 * Sets the required headers and sends an initial "connected" event.
 */
export const addClient = (res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if behind proxy
  res.flushHeaders();

  // Send initial heartbeat so the browser knows the connection is live
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok' })}\n\n`);

  clients.add(res);
  console.log(`[SSE] Client connected. Total: ${clients.size}`);
};

/**
 * Remove a client when they disconnect (tab closed, navigated away, etc.)
 */
export const removeClient = (res: Response): void => {
  clients.delete(res);
  console.log(`[SSE] Client disconnected. Total: ${clients.size}`);
};

/**
 * Broadcast a named event + JSON payload to ALL connected clients.
 *
 * @param eventName  e.g. 'LOGISTICS_NOTICE'
 * @param payload    Any JSON-serialisable object
 */
export const broadcast = (eventName: string, payload: object): void => {
  if (clients.size === 0) return;

  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  let removed = 0;

  clients.forEach(res => {
    try {
      res.write(data);
    } catch {
      // Client already disconnected — clean up
      clients.delete(res);
      removed++;
    }
  });

  console.log(`[SSE] Broadcast "${eventName}" → ${clients.size} clients (${removed} stale removed)`);
};

/**
 * Send a keepalive ping to all clients every 25 seconds.
 * This prevents proxies and browsers from closing idle SSE connections.
 */
export const startKeepalive = (): void => {
  setInterval(() => {
    clients.forEach(res => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clients.delete(res);
      }
    });
  }, 25_000);
};
