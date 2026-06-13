import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { gregorianToEthiopian } from '../shared/ethiopianCalendar';

/** Format a Date to Ethiopian "HH:MM AM/PM" string */
function formatEthiopianTime(date: Date): string {
  let ethHour = date.getHours() - 6;
  if (ethHour < 0) ethHour += 24;
  const meridiem = ethHour >= 12 ? 'PM' : 'AM';
  let displayHour = ethHour % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour.toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${meridiem}`;
}

/** Determine if a punch time is a late arrival in Ethiopian time (after 02:20 AM) */
function isLate(date: Date): boolean {
  let ethHour = date.getHours() - 6;
  if (ethHour < 0) ethHour += 24;
  const totalMin = ethHour * 60 + date.getMinutes();
  return totalMin > 2 * 60 + 20; // 02:20 AM Ethiopian
}

/**
 * Compute status from the current state of all four punch slots.
 * Rules:
 *   - All 4 punches present → 'present'  (is_late_arrival preserved in DB for "Present (Late)" display)
 *   - At least punch 1, but NOT all 4 → if late arrival: 'late', else: 'half-day'
 *   - No punches → 'absent'
 */
function computeStatus(row: {
  sign_in_time: string | null;
  lunch_out_time: string | null;
  lunch_in_time: string | null;
  sign_out_time: string | null;
  is_late_arrival: boolean;
}): string {
  if (row.sign_in_time && row.lunch_out_time && row.lunch_in_time && row.sign_out_time) {
    return 'present';
  }
  if (row.sign_in_time) {
    return row.is_late_arrival ? 'late' : 'half-day';
  }
  return 'absent';
}

class MachineController {
  async syncAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
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
          const userResult = await client.query(
            'SELECT id FROM users WHERE zk_device_id = $1 OR digital_id = $1 LIMIT 1',
            [log.zkDeviceId]
          );

          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id;
            const timestamp = new Date(log.timestamp);

            if (Number.isNaN(timestamp.getTime())) continue;

            const ethParts = gregorianToEthiopian(timestamp);
            const date = `${ethParts.year}-${String(ethParts.month).padStart(2, '0')}-${String(ethParts.day).padStart(2, '0')}`;
            const signTime = formatEthiopianTime(timestamp);
            const lateArrival = isLate(timestamp);

            // Load existing record for today
            const existing = await client.query(
              `SELECT id, sign_in_time, lunch_out_time, lunch_in_time, sign_out_time, is_late_arrival
               FROM employee_attendance
               WHERE user_id = $1 AND date = $2`,
              [userId, date]
            );

            if (existing.rows.length === 0) {
              // ── FIRST PUNCH OF THE DAY: Arrival ─────────────────────────────
              const initialStatus = lateArrival ? 'late' : 'half-day';
              await client.query(
                `INSERT INTO employee_attendance
                   (user_id, date, status, recorded_by, sign_in_time, is_late_arrival, created_at)
                 VALUES ($1, $2, $3, 'zk-machine', $4, $5, NOW())`,
                [userId, date, initialStatus, signTime, lateArrival]
              );
              processed++;
            } else {
              const row = existing.rows[0];

              // Skip duplicate punch (same minute already recorded today)
              if (
                row.sign_in_time === signTime ||
                row.lunch_out_time === signTime ||
                row.lunch_in_time === signTime ||
                row.sign_out_time === signTime
              ) {
                continue;
              }

              if (row.lunch_out_time === null) {
                // ── SECOND PUNCH: Lunch Out ──────────────────────────────────
                const projected = { ...row, lunch_out_time: signTime };
                await client.query(
                  `UPDATE employee_attendance
                   SET lunch_out_time = $1, status = $2, recorded_by = 'zk-machine'
                   WHERE user_id = $3 AND date = $4`,
                  [signTime, computeStatus(projected), userId, date]
                );
              } else if (row.lunch_in_time === null) {
                // ── THIRD PUNCH: Lunch In ────────────────────────────────────
                const projected = { ...row, lunch_in_time: signTime };
                await client.query(
                  `UPDATE employee_attendance
                   SET lunch_in_time = $1, status = $2, recorded_by = 'zk-machine'
                   WHERE user_id = $3 AND date = $4`,
                  [signTime, computeStatus(projected), userId, date]
                );
              } else {
                // ── FOURTH PUNCH: Departure — full day complete ──────────────
                await client.query(
                  `UPDATE employee_attendance
                   SET sign_out_time = $1, status = 'present', recorded_by = 'zk-machine'
                   WHERE user_id = $2 AND date = $3`,
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