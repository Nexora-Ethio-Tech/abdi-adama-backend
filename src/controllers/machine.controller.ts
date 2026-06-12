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

            // Format time as "HH:MM AM/PM" for display
            const signTime = Number.isNaN(timestamp.getTime())
              ? null
              : timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            // Check if already exists (first punch = sign-in, second = lunch-out, third = lunch-in, fourth/last = sign-out)
            const existing = await client.query(
              'SELECT id, sign_in_time, lunch_out_time, lunch_in_time, sign_out_time FROM employee_attendance WHERE user_id = $1 AND date = $2',
              [userId, date]
            );

            if (existing.rows.length === 0) {
              // First punch of the day → create sign-in record
              await client.query(
                `INSERT INTO employee_attendance (user_id, date, status, recorded_by, sign_in_time, created_at)
                 VALUES ($1, $2, $3, 'zk-machine', $4, $5)`,
                [userId, date, status, signTime, log.timestamp]
              );
              processed++;
            } else {
              const row = existing.rows[0];
              // Skip if the punch is in the same minute as any already recorded punch today
              if (
                row.sign_in_time === signTime ||
                row.lunch_out_time === signTime ||
                row.lunch_in_time === signTime ||
                row.sign_out_time === signTime
              ) {
                continue;
              }

              if (row.lunch_out_time === null) {
                // Second punch of the day → lunch-out time
                await client.query(
                  `UPDATE employee_attendance SET lunch_out_time = $1, recorded_by = 'zk-machine' WHERE user_id = $2 AND date = $3`,
                  [signTime, userId, date]
                );
              } else if (row.lunch_in_time === null) {
                // Third punch of the day → lunch-in time
                await client.query(
                  `UPDATE employee_attendance SET lunch_in_time = $1, recorded_by = 'zk-machine' WHERE user_id = $2 AND date = $3`,
                  [signTime, userId, date]
                );
              } else {
                // Fourth or subsequent punch of the day → sign-out time
                await client.query(
                  `UPDATE employee_attendance SET sign_out_time = $1, recorded_by = 'zk-machine' WHERE user_id = $2 AND date = $3`,
                  [signTime, userId, date]
                );
              }
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