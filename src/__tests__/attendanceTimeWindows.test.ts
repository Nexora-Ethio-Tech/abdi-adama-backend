import {
  DEFAULT_ATTENDANCE_WINDOWS,
  timeStringToMinutes,
  isWithinInterval,
  evaluateAttendanceStatus,
  AttendanceWindows,
} from '../utils/attendanceTime.helper';

describe('attendanceTime.helper', () => {
  describe('timeStringToMinutes', () => {
    it('parses standard 24h times correctly', () => {
      expect(timeStringToMinutes('08:30')).toBe(8 * 60 + 30);
      expect(timeStringToMinutes('12:00')).toBe(12 * 60);
      expect(timeStringToMinutes('13:00')).toBe(13 * 60);
      expect(timeStringToMinutes('17:45')).toBe(17 * 60 + 45);
    });

    it('parses 12h AM/PM strings correctly', () => {
      expect(timeStringToMinutes('08:30 AM')).toBe(8 * 60 + 30);
      expect(timeStringToMinutes('12:00 PM')).toBe(12 * 60);
      expect(timeStringToMinutes('01:00 PM')).toBe(13 * 60);
      expect(timeStringToMinutes('05:30 PM')).toBe(17 * 60 + 30);
      expect(timeStringToMinutes('12:30 AM')).toBe(30);
    });

    it('returns null for empty or invalid strings', () => {
      expect(timeStringToMinutes(null)).toBeNull();
      expect(timeStringToMinutes(undefined)).toBeNull();
      expect(timeStringToMinutes('--')).toBeNull();
      expect(timeStringToMinutes('--:--')).toBeNull();
      expect(timeStringToMinutes('')).toBeNull();
      expect(timeStringToMinutes('invalid')).toBeNull();
    });
  });

  describe('isWithinInterval', () => {
    it('checks standard time intervals', () => {
      const timeMins = timeStringToMinutes('08:45');
      expect(isWithinInterval(timeMins, '08:30', '09:00')).toBe(true);

      const tooEarly = timeStringToMinutes('08:15');
      expect(isWithinInterval(tooEarly, '08:30', '09:00')).toBe(false);

      const tooLate = timeStringToMinutes('09:15');
      expect(isWithinInterval(tooLate, '08:30', '09:00')).toBe(false);
    });

    it('handles lunch out interval [12:00 - 13:00]', () => {
      const inWindow = timeStringToMinutes('12:20');
      expect(isWithinInterval(inWindow, '12:00', '13:00')).toBe(true);

      const outside = timeStringToMinutes('13:15');
      expect(isWithinInterval(outside, '12:00', '13:00')).toBe(false);
    });

    it('handles lunch in interval [13:00 - 14:00]', () => {
      const inWindow = timeStringToMinutes('13:40');
      expect(isWithinInterval(inWindow, '13:00', '14:00')).toBe(true);
    });

    it('handles leave interval [17:00 - 18:00]', () => {
      const inWindow = timeStringToMinutes('17:30');
      expect(isWithinInterval(inWindow, '17:00', '18:00')).toBe(true);

      const earlyLeave = timeStringToMinutes('16:30');
      expect(isWithinInterval(earlyLeave, '17:00', '18:00')).toBe(false);
    });
  });

  describe('evaluateAttendanceStatus', () => {
    const windows: AttendanceWindows = {
      morningCheckInStart: '07:30',
      morningCheckInEnd: '08:30',
      lunchCheckOutStart: '12:00',
      lunchCheckOutEnd: '13:00',
      lunchCheckInStart: '13:00',
      lunchCheckInEnd: '14:00',
      leaveStart: '17:00',
      leaveEnd: '18:00',
    };

    it('returns "present" when all 4 punches are completed within intervals', () => {
      const punches = {
        sign_in_time: '07:45 AM',
        lunch_out_time: '12:15 PM',
        lunch_in_time: '01:20 PM',
        sign_out_time: '05:30 PM',
      };

      const result = evaluateAttendanceStatus(punches, windows);
      expect(result.status).toBe('present');
      expect(result.validMorning).toBe(true);
      expect(result.validLunchOut).toBe(true);
      expect(result.validLunchIn).toBe(true);
      expect(result.validLeave).toBe(true);
      expect(result.completedPunchCount).toBe(4);
    });

    it('returns "half-day" when one punch is missing (3 of 4 punches)', () => {
      const punches = {
        sign_in_time: '07:45 AM',
        lunch_out_time: '12:15 PM',
        lunch_in_time: '01:20 PM',
        sign_out_time: null, // Missed departure punch
      };

      const result = evaluateAttendanceStatus(punches, windows);
      expect(result.status).toBe('half-day');
      expect(result.completedPunchCount).toBe(3);
    });

    it('returns "half-day" when only morning punch is recorded', () => {
      const punches = {
        sign_in_time: '07:50 AM',
        lunch_out_time: null,
        lunch_in_time: null,
        sign_out_time: null,
      };

      const result = evaluateAttendanceStatus(punches, windows);
      expect(result.status).toBe('half-day');
      expect(result.completedPunchCount).toBe(1);
    });

    it('returns "half-day" when 4 punches exist but one was outside the interval', () => {
      const punches = {
        sign_in_time: '09:05 AM', // Arrived late (outside 07:30-08:30)
        lunch_out_time: '12:15 PM',
        lunch_in_time: '01:20 PM',
        sign_out_time: '05:30 PM',
      };

      const result = evaluateAttendanceStatus(punches, windows);
      expect(result.status).toBe('half-day');
      expect(result.validMorning).toBe(false);
    });

    it('returns "absent" (full day) when all punches are missing', () => {
      const punches = {
        sign_in_time: null,
        lunch_out_time: null,
        lunch_in_time: null,
        sign_out_time: null,
      };

      const result = evaluateAttendanceStatus(punches, windows);
      expect(result.status).toBe('absent');
      expect(result.completedPunchCount).toBe(0);
    });

    it('evaluates custom configured intervals for a given date', () => {
      // Custom schedule: Morning 08:00 - 09:30, Lunch Out 11:30 - 12:30, Lunch In 12:30 - 13:30, Leave 16:00 - 17:00
      const customWindows: AttendanceWindows = {
        morningCheckInStart: '08:00',
        morningCheckInEnd: '09:30',
        lunchCheckOutStart: '11:30',
        lunchCheckOutEnd: '12:30',
        lunchCheckInStart: '12:30',
        lunchCheckInEnd: '13:30',
        leaveStart: '16:00',
        leaveEnd: '17:00',
      };

      const punches = {
        sign_in_time: '08:10 AM',
        lunch_out_time: '12:00 PM',
        lunch_in_time: '01:00 PM',
        sign_out_time: '04:30 PM',
      };

      const result = evaluateAttendanceStatus(punches, customWindows);
      expect(result.status).toBe('present');
    });
  });
});
