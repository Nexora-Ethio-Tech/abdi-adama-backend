import { Response } from 'express';

/**
 * SSE (Server-Sent Events) Manager
 *
 * Maintains a registry of all active SSE connections with metadata (branch, role).
 */

interface ClientMetadata {
  branchId: string;
  role: string;
  identityId: string;
  childIdentityIds?: string[]; // Only for Parents
}

const clients = new Map<Response, ClientMetadata>();

/**
 * Register a new SSE client connection with metadata.
 */
export const addClient = (res: Response, metadata: ClientMetadata): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial heartbeat
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'ok', branchId: metadata.branchId })}\n\n`);

  clients.set(res, metadata);
  console.log(`[SSE] Client connected (Branch: ${metadata.branchId}, Role: ${metadata.role}). Total: ${clients.size}`);
};

/**
 * Remove a client when they disconnect.
 */
export const removeClient = (res: Response): void => {
  clients.delete(res);
  console.log(`[SSE] Client disconnected. Total: ${clients.size}`);
};

/**
 * Broadcast a named event + JSON payload.
 * Optional targetBranch ensures isolation (e.g. logistics notices).
 *
 * @param eventName      e.g. 'LOGISTICS_NOTICE'
 * @param payload        Any JSON-serialisable object
 * @param targetBranch   Optional branch ID to filter recipients
 * @param allowedRoles   Optional array of roles allowed to receive this event
 * @param allowedStudentIdentities Optional array of student IDs (for logistics notices)
 */
export const broadcast = (eventName: string, payload: object, targetBranch?: string, allowedRoles?: string[], allowedStudentIdentities?: string[]): void => {
  if (clients.size === 0) return;

  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  let removed = 0;
  let sentCount = 0;

  clients.forEach((metadata, res) => {
    // 1. Branch Filtering
    if (targetBranch && metadata.branchId !== targetBranch && metadata.role !== 'Admin' && metadata.role !== 'SchoolAdmin') {
      return;
    }

    // 2. Role Filtering
    if (allowedRoles && !allowedRoles.includes(metadata.role)) {
      return;
    }

    // 3. Identity Filtering (Strict "Assigned" Isolation)
    // Only enforce when the list is non-empty — empty list means no manifest data, don't block everyone.
    if (allowedStudentIdentities && allowedStudentIdentities.length > 0 && (metadata.role === 'Student' || metadata.role === 'Parent')) {
      if (metadata.role === 'Student') {
        if (!allowedStudentIdentities.includes(metadata.identityId)) return;
      } else if (metadata.role === 'Parent') {
        // Parent must have at least one child in the allowed list
        const hasAssignedChild = metadata.childIdentityIds?.some(cid => allowedStudentIdentities.includes(cid));
        if (!hasAssignedChild) return;
      }
    }
    // 4. Driver Isolation (Drivers only see their own posts in real-time)
    if (metadata.role === 'Driver' && eventName === 'LOGISTICS_NOTICE') {
      const p = payload as any;
      if (p.senderId && p.senderId !== metadata.identityId) return;
    }

    try {
      res.write(data);
      sentCount++;
    } catch {
      clients.delete(res);
      removed++;
    }
  });

  if (eventName === 'LOGISTICS_NOTICE') {
    console.log(`[SSE Debug] Logistics Broadcast: TargetBranch=${targetBranch}, Sent=${sentCount}, Candidates=${clients.size}, AllowedIdentities=${allowedStudentIdentities?.length || 0}`);
  }

  console.log(`[SSE] Broadcast "${eventName}" → ${sentCount} clients (Target Branch: ${targetBranch || 'ALL'}, ${removed} stale removed)`);
};

/**
 * Send a keepalive ping to all clients every 25 seconds.
 */
export const startKeepalive = (): void => {
  setInterval(() => {
    clients.forEach((_, res) => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clients.delete(res);
      }
    });
  }, 25_000);
};
