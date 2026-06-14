export type EthiopianDateParts = {
  year: number;
  month: number;
  day: number;
};

const ETHIOPIAN_EPOCH = 1723856;

/**
 * East Africa Time is UTC+3 with no DST.
 * Returns a new Date object whose local-time components (getFullYear, getMonth, getDate)
 * reflect the current moment in Addis Ababa, regardless of the server's OS timezone.
 *
 * Use this instead of `new Date()` whenever you need "today" in EAT.
 */
export const nowInEAT = (): Date => {
  const EAT_OFFSET_MS = 3 * 60 * 60 * 1000; // UTC+3
  const utcMs = Date.now();
  return new Date(utcMs + EAT_OFFSET_MS);
};

/**
 * Returns today's date in EAT as a YYYY-MM-DD string.
 * Safe to use for database writes that expect a plain date (no time shift).
 */
export const getTodayEATDateString = (): string => {
  const eat = nowInEAT();
  const y = eat.getUTCFullYear();
  const m = String(eat.getUTCMonth() + 1).padStart(2, '0');
  const d = String(eat.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toJdnFromGregorian = (year: number, month: number, day: number) => {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
};

const jdnToEthiopian = (jdn: number): EthiopianDateParts => {
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
};

const ethiopianToJdn = ({ year, month, day }: EthiopianDateParts) =>
  1724220 + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day;

/**
 * Convert a Gregorian Date or date string to Ethiopian calendar parts.
 * - If given a Date object, uses its LOCAL time components.
 * - If given a string:
 *   - Plain YYYY-MM-DD → parsed as local midnight (no UTC shift).
 *   - ISO datetime (contains 'T') → the UTC timestamp is shifted to EAT (+3h)
 *     before extraction, so stored UTC timestamps display the correct EAT day.
 */
export const gregorianToEthiopian = (date: Date | string): EthiopianDateParts => {
  let year: number, month: number, day: number;

  if (typeof date === 'string') {
    if (date.includes('T') || date.endsWith('Z')) {
      // ISO datetime: shift to EAT before reading date parts
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) return { year: 2018, month: 1, day: 1 };
      const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
      const eat = new Date(parsed.getTime() + EAT_OFFSET_MS);
      year = eat.getUTCFullYear();
      month = eat.getUTCMonth() + 1;
      day = eat.getUTCDate();
    } else {
      // Plain YYYY-MM-DD: parse as local date to avoid UTC shift
      const parts = date.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return { year: 2018, month: 1, day: 1 };
      year = parts[0]; month = parts[1]; day = parts[2];
    }
  } else {
    if (isNaN(date.getTime())) return { year: 2018, month: 1, day: 1 };
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
  }

  const jdn = toJdnFromGregorian(year, month, day);
  return jdnToEthiopian(jdn);
};

export const ethiopianToGregorianDate = (parts: EthiopianDateParts): Date => {
  const jdn = ethiopianToJdn(parts);
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return new Date(year, month - 1, day);
};

/** Returns the current Ethiopian calendar year using EAT-correct date. */
export function getCurrentECYear(): number {
  return gregorianToEthiopian(nowInEAT()).year;
}

/** Returns the current academic semester using EAT-correct date. */
export function getCurrentSemester(): 1 | 2 {
  const eat = nowInEAT();
  const month = eat.getUTCMonth() + 1; // 1-based
  const day = eat.getUTCDate();
  // Sep 11 to Jan 31 → First Semester
  if ((month === 9 && day >= 11) || month >= 10 || month === 1) return 1;
  // Feb 1 to Jun 30 → Second Semester
  if (month >= 2 && month <= 6) return 2;
  // Jul–Sep 10: summer / between years → treat as 2
  return 2;
}

export function formatSemester(semester: 1 | 2): string {
  return semester === 1 ? 'First Semester' : 'Second Semester';
}

export function ethiopianToGregorianIso(ethDateStr: string): string | null {
  if (!ethDateStr) return null;
  const parts = ethDateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  try {
    const gregDate = ethiopianToGregorianDate({ year, month, day });
    const y = gregDate.getFullYear();
    const m = String(gregDate.getMonth() + 1).padStart(2, '0');
    const d = String(gregDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch (e) {
    return null;
  }
}
