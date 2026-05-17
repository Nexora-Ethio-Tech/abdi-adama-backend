import { Response } from 'express';
import pool from '../config/db';

/**
 * SSE (Server-Sent Events) Manager
 *
 * Maintains a registry of all active SSE connections with user context.
 * When the driver posts a logistics notice, `broadcast()` is called
 * and only specific connected student and parent clients on that driver's route receive it instantly.
 */

export interface SSEClient {
  res: Response;
  userId?: string;
  identityId?: string;
  role?: string;
}

const clients = new Set<SSEClient>();

/**
 * Register a new SSE client connection with user authentication context.
 */
export const addClient = (res: Response, user?: any): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering if behind proxy
  res.flushHeaders();

  // Send initial heartbeat so the browser knows the connection is live
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok' })}\n\n`);

  clients.add({
    res,
    userId: user?.user_id,
    identityId: user?.identity_id,
    role: user?.role,
  });

  console.log(`[SSE] Client connected (User: ${user?.user_id || 'anonymous'}, Role: ${user?.role || 'none'}). Total: ${clients.size}`);
};

/**
 * Remove a client when they disconnect (tab closed, navigated away, etc.)
 */
export const removeClient = (res: Response): void => {
  for (const client of clients) {
    if (client.res === res) {
      clients.delete(client);
      break;
    }
  }
  console.log(`[SSE] Client disconnected. Total: ${clients.size}`);
};

/**
 * Broadcast a named event + JSON payload to connected clients.
 * If eventName is 'LOGISTICS_NOTICE' and senderId (driver's identity ID) is provided,
 * the message is specifically targeted only to the assigned students and their parents.
 *
 * @param eventName  e.g. 'LOGISTICS_NOTICE'
 * @param payload    Any JSON-serialisable object
 * @param senderId   Optional driver identity ID to filter target recipients
 */
export const broadcast = async (eventName: string, payload: object, senderId?: string): Promise<void> => {
  if (clients.size === 0) return;

  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  let removed = 0;

  let targetStudents: Set<string> = new Set();
  let targetParents: Set<string> = new Set();
  let isFiltered = false;

  if (eventName === 'LOGISTICS_NOTICE' && senderId) {
    try {
      // 1. Find all student IDs assigned to this driver's route
      const studentsResult = await pool.query(
        `SELECT student_id 
         FROM silo_route_manifest 
         WHERE route_id IN (SELECT id FROM silo_routes WHERE driver_id = $1)`,
        [senderId]
      );
      studentsResult.rows.forEach((row: any) => {
        if (row.student_id) targetStudents.add(row.student_id);
      });

      // 2. Find all parent user IDs of these students
      const parentsResult = await pool.query(
        `SELECT DISTINCT parent_user_id 
         FROM silo_family_links 
         WHERE student_identity_id IN (
           SELECT student_id 
           FROM silo_route_manifest 
           WHERE route_id IN (SELECT id FROM silo_routes WHERE driver_id = $1)
         )`,
        [senderId]
      );
      parentsResult.rows.forEach((row: any) => {
        if (row.parent_user_id) targetParents.add(row.parent_user_id);
      });

      isFiltered = true;
      console.log(`[SSE Filter] Target Students: ${targetStudents.size}, Target Parents: ${targetParents.size}`);
    } catch (err: any) {
      console.error('[SSE] Failed to fetch filter lists for logistics notice broadcast:', err.message);
      // Fallback: do not filter if database check fails
      isFiltered = false;
    }
  }

  let sentCount = 0;

  clients.forEach(client => {
    try {
      // Check logistics notice recipient filtering rules
      if (isFiltered) {
        const role = client.role;
        if (role === 'Student') {
          if (!client.identityId || !targetStudents.has(client.identityId)) {
            return; // Skip student not assigned to this driver's route
          }
        } else if (role === 'Parent') {
          if (!client.userId || !targetParents.has(client.userId)) {
            return; // Skip parent whose children are not assigned to this driver's route
          }
        }
      }

      client.res.write(data);
      sentCount++;
    } catch {
      // Client already disconnected — clean up
      clients.delete(client);
      removed++;
    }
  });

  console.log(`[SSE] Broadcast "${eventName}" → ${sentCount} targeted clients (${removed} stale removed)`);
};

/**
 * Send a keepalive ping to all clients every 25 seconds.
 * This prevents proxies and browsers from closing idle SSE connections.
 */
export const startKeepalive = (): void => {
  setInterval(() => {
    clients.forEach(client => {
      try {
        client.res.write(': keepalive\n\n');
      } catch {
        clients.delete(client);
      }
    });
  }, 25_000);
};
