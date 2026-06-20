import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { gregorianToEthiopian } from '../shared/ethiopianCalendar';

/** Format a standard HH:MM AM/PM string, converted to Ethiopian Clock (subtract 6 hours) */
function formatTime12Hour(hour: number, minute: number): string {
  let ethHour = hour - 6;
  if (ethHour < 0) ethHour += 24;
  const meridiem = ethHour >= 12 ? 'PM' : 'AM';
  let displayHour = ethHour % 12;
  if (displayHour === 0) displayHour = 12;
  return `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${meridiem}`;
}

/** Determine if a punch time is a late arrival in Ethiopian time (after 02:20 AM Ethiopian clock) */
function isLate(hour: number, minute: number): boolean {
  let ethHour = hour - 6;
  if (ethHour < 0) ethHour += 24;
  const totalMin = ethHour * 60 + minute;
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
      const expectedKey = process.env.MACHINE_API_KEY || 'abdi_adama_zk_secure_key_2026';
      if (apiKey !== expectedKey) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { logs } = req.body; // Array of { zkDeviceId: string, timestamp: string, type?: number }
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

            // Parse directly from local ISO string to avoid timezone shifts
            const match = log.timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
            if (!match) {
              console.warn(`[ZK Backend] Skipping log with invalid timestamp format: ${log.timestamp}`);
              continue;
            }

            const [_, yearStr, monthStr, dayStr, hourStr, minuteStr] = match;
            const hour = parseInt(hourStr, 10);
            const minute = parseInt(minuteStr, 10);

            // Format sign-in time exactly as shown on the device (no shift)
            const signTime = formatTime12Hour(hour, minute);
            const lateArrival = isLate(hour, minute);

            // Convert Gregorian date to Ethiopian date parts
            const gregDateStr = `${yearStr}-${monthStr}-${dayStr}`;
            const ethParts = gregorianToEthiopian(gregDateStr);
            const date = `${ethParts.year}-${String(ethParts.month).padStart(2, '0')}-${String(ethParts.day).padStart(2, '0')}`;

            // Determine if the punch is a Check-In ('in') or Check-Out ('out')
            // ZK punch types: 
            // 0: Check-In, 3: Break-In (Lunch In), 4: Overtime-In -> 'in'
            // 1: Check-Out, 2: Break-Out (Lunch Out), 5: Overtime-Out -> 'out'
            const punchType = typeof log.type === 'number' ? log.type : 0;
            const punchDir = (punchType === 0 || punchType === 3 || punchType === 4) ? 'in' : 'out';

            // Load existing record for today
            const existing = await client.query(
              `SELECT id, sign_in_time, lunch_out_time, lunch_in_time, sign_out_time, is_late_arrival
               FROM employee_attendance
               WHERE user_id = $1 AND date = $2`,
              [userId, date]
            );

            if (existing.rows.length === 0) {
              // ── FIRST PUNCH OF THE DAY: Must be a Check-In (Arrival) ──
              if (punchDir !== 'in') {
                console.log(`[ZK Sync] Ignored Check-Out punch (type ${punchType}) for user ${userId} on date ${date}: No Arrival check-in found.`);
                continue;
              }

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
                // ── SECOND PUNCH: Must be a Check-Out (Lunch Out) ──
                if (punchDir !== 'out') {
                  console.log(`[ZK Sync] Ignored Check-In punch (type ${punchType}) for user ${userId} on date ${date}: Already checked in (Arrival), awaiting Lunch Out.`);
                  continue;
                }

                const projected = { ...row, lunch_out_time: signTime };
                await client.query(
                  `UPDATE employee_attendance
                   SET lunch_out_time = $1, status = $2, recorded_by = 'zk-machine'
                   WHERE user_id = $3 AND date = $4`,
                  [signTime, computeStatus(projected), userId, date]
                );
              } else if (row.lunch_in_time === null) {
                // ── THIRD PUNCH: Must be a Check-In (Lunch In) ──
                if (punchDir !== 'in') {
                  console.log(`[ZK Sync] Ignored Check-Out punch (type ${punchType}) for user ${userId} on date ${date}: Awaiting Lunch In check-in.`);
                  continue;
                }

                const projected = { ...row, lunch_in_time: signTime };
                await client.query(
                  `UPDATE employee_attendance
                   SET lunch_in_time = $1, status = $2, recorded_by = 'zk-machine'
                   WHERE user_id = $3 AND date = $4`,
                  [signTime, computeStatus(projected), userId, date]
                );
              } else if (row.sign_out_time === null) {
                // ── FOURTH PUNCH: Must be a Check-Out (Departure) ──
                if (punchDir !== 'out') {
                  console.log(`[ZK Sync] Ignored Check-In punch (type ${punchType}) for user ${userId} on date ${date}: Already checked in (Lunch In), awaiting Departure.`);
                  continue;
                }

                await client.query(
                  `UPDATE employee_attendance
                   SET sign_out_time = $1, status = 'present', recorded_by = 'zk-machine'
                   WHERE user_id = $2 AND date = $3`,
                  [signTime, userId, date]
                );
              } else {
                console.log(`[ZK Sync] Ignored extra punch for user ${userId} on date ${date}: All 4 attendance sequence slots already recorded.`);
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