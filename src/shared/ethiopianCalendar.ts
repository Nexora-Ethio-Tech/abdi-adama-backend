export type EthiopianDateParts = {
  year: number;
  month: number;
  day: number;
};

const ETHIOPIAN_EPOCH = 1723856;

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

export const gregorianToEthiopian = (date: Date): EthiopianDateParts => {
  const jdn = toJdnFromGregorian(date.getFullYear(), date.getMonth() + 1, date.getDate());
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

export function getCurrentECYear(): number {
  return gregorianToEthiopian(new Date()).year;
}

export function getCurrentSemester(): 1 | 2 {
  const month = new Date().getMonth() + 1; // 1-based (1=Jan, 12=Dec)
  const day = new Date().getDate();
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
