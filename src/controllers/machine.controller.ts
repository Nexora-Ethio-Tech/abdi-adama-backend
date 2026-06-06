import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

class MachineController {
  async syncAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Basic security key check
      const apiKey = req.headers['x-api-key'];
      if (apiKey !== process.env.MACHINE_API_KEY) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { logs } = req.body; // Array of { zkDeviceId: string, timestamp: string }
      if (!Array.isArray(logs) || logs.length === 0) {
        res.status(400).json({ success: false, message: 'Invalid or empty logs array' });
        return;
      }

      const client = await pool.connect();
      let processed = 0;

      try {
        await client.query('BEGIN');

        for (const log of logs) {
          // Find user by zk_device_id
          const userResult = await client.query('SELECT id FROM users WHERE zk_device_id = $1 OR digital_id = $1 LIMIT 1', [log.zkDeviceId]);

          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            const date = log.timestamp.split('T')[0]; // Extract YYYY-MM-DD from ISO timestamp
            const timestamp = new Date(log.timestamp);
            const cutoffMinutes = 8 * 60 + 45; // 08:45 local time
            const logMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
            const status = Number.isNaN(timestamp.getTime()) ? 'present' : (logMinutes > cutoffMinutes ? 'absent' : 'present');

            // Check if already exists to avoid duplicates
            const existing = await client.query('SELECT id FROM employee_attendance WHERE user_id = $1 AND date = $2', [userId, date]);

            if (existing.rows.length === 0) {
              await client.query(
                `INSERT INTO employee_attendance (user_id, date, status, recorded_by, created_at)
                 VALUES ($1, $2, $3, $1, $4)`,
                [userId, date, status, log.timestamp]
              );
              processed++;
            }
          }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Successfully synced ${processed} attendance records` });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
}

export default new MachineController();