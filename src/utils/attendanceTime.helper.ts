export interface AttendanceWindows {
  morningCheckInStart: string; // e.g. "07:30"
  morningCheckInEnd: string;   // e.g. "08:30"
  lunchCheckOutStart: string;  // e.g. "12:00"
  lunchCheckOutEnd: string;    // e.g. "13:00"
  lunchCheckInStart: string;   // e.g. "13:00"
  lunchCheckInEnd: string;     // e.g. "14:00"
  leaveStart: string;          // e.g. "17:00"
  leaveEnd: string;            // e.g. "18:00"
}

export const DEFAULT_ATTENDANCE_WINDOWS: AttendanceWindows = {
  morningCheckInStart: '07:30',
  morningCheckInEnd: '08:30',
  lunchCheckOutStart: '12:00',
  lunchCheckOutEnd: '13:00',
  lunchCheckInStart: '13:00',
  lunchCheckInEnd: '14:00',
  leaveStart: '17:00',
  leaveEnd: '18:00',
};

/**
 * Normalizes a time string ("HH:MM", "HH:MM AM/PM", Ethiopian or standard)
 * into total minutes from standard midnight (0..1439).
 */
export function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  if (!trimmed || trimmed === '--' || trimmed === '--:--') return null;

  // Match "HH:MM AM" or "HH:MM PM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match12) return null;

  let hour = parseInt(match12[1], 10);
  const minute = parseInt(match12[2], 10);
  const meridiem = match12[3] ? match12[3].toUpperCase() : null;

  if (isNaN(hour) || isNaN(minute) || minute < 0 || minute > 59) return null;

  if (meridiem) {
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
  }

  return hour * 60 + minute;
}

/**
 * Checks if a given time in minutes falls within [start, end].
 * Handles overnight wraps if start > end.
 */
export function isWithinInterval(
  timeMins: number | null,
  startStr: string,
  endStr: string
): boolean {
  if (timeMins === null) return false;
  const startMins = timeStringToMinutes(startStr);
  const endMins = timeStringToMinutes(endStr);

  if (startMins === null || endMins === null) return false;

  // If time in minutes could also be stored in Ethiopian 12-hour clock (6 hours shift):
  // Let's check both standard time and Ethiopian-shifted equivalent (timeMins + 360) % 1440
  const candidateTimes = [timeMins, (timeMins + 6 * 60) % (24 * 60)];

  return candidateTimes.some((t) => {
    if (startMins <= endMins) {
      return t >= startMins && t <= endMins;
    } else {
      // Wraps around midnight
      return t >= startMins || t <= endMins;
    }
  });
}

export interface AttendancePunchEvaluation {
  status: 'present' | 'half-day' | 'absent';
  validMorning: boolean;
  validLunchOut: boolean;
  validLunchIn: boolean;
  validLeave: boolean;
  completedPunchCount: number;
}

/**
 * Evaluates the attendance status for an employee record given the configured interval windows:
 * - All 4 completed within interval -> 'present'
 * - At least 1 punch recorded, but missing 1 or more punches or out of intervals -> 'half-day'
 * - All punches missing -> 'absent'
 */
export function evaluateAttendanceStatus(
  punches: {
    sign_in_time?: string | null;
    lunch_out_time?: string | null;
    lunch_in_time?: string | null;
    sign_out_time?: string | null;
  },
  windows: AttendanceWindows = DEFAULT_ATTENDANCE_WINDOWS
): AttendancePunchEvaluation {
  const morningMins = timeStringToMinutes(punches.sign_in_time);
  const lunchOutMins = timeStringToMinutes(punches.lunch_out_time);
  const lunchInMins = timeStringToMinutes(punches.lunch_in_time);
  const leaveMins = timeStringToMinutes(punches.sign_out_time);

  const hasMorning = morningMins !== null;
  const hasLunchOut = lunchOutMins !== null;
  const hasLunchIn = lunchInMins !== null;
  const hasLeave = leaveMins !== null;

  const validMorning = isWithinInterval(
    morningMins,
    windows.morningCheckInStart,
    windows.morningCheckInEnd
  );
  const validLunchOut = isWithinInterval(
    lunchOutMins,
    windows.lunchCheckOutStart,
    windows.lunchCheckOutEnd
  );
  const validLunchIn = isWithinInterval(
    lunchInMins,
    windows.lunchCheckInStart,
    windows.lunchCheckInEnd
  );
  const validLeave = isWithinInterval(
    leaveMins,
    windows.leaveStart,
    windows.leaveEnd
  );

  const totalRecorded = [hasMorning, hasLunchOut, hasLunchIn, hasLeave].filter(Boolean).length;
  const allWithinInterval = validMorning && validLunchOut && validLunchIn && validLeave;

  let status: 'present' | 'half-day' | 'absent' = 'absent';

  if (allWithinInterval) {
    status = 'present';
  } else if (totalRecorded > 0) {
    // Missing one or more punches or incomplete interval sequence
    status = 'half-day';
  } else {
    // All missing
    status = 'absent';
  }

  return {
    status,
    validMorning,
    validLunchOut,
    validLunchIn,
    validLeave,
    completedPunchCount: totalRecorded,
  };
}
