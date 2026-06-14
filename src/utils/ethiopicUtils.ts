/**
 * Ethiopic Calendar Utilities
 *
 * Converts Gregorian dates to Ethiopic (EC) month names and years.
 * The Ethiopic New Year (Enkutatash) falls on September 11 each Gregorian year.
 *
 * Gregorian → Ethiopic month mapping:
 *   Sep 11 – Oct 10  →  Meskerem  (Month 1)
 *   Oct 11 – Nov 09  →  Tikimt    (Month 2)
 *   Nov 10 – Dec 09  →  Hidar     (Month 3)
 *   Dec 10 – Jan 08  →  Tahsas    (Month 4)
 *   Jan 09 – Feb 07  →  Tir       (Month 5)
 *   Feb 08 – Mar 09  →  Yekatit   (Month 6)
 *   Mar 10 – Apr 08  →  Megabit   (Month 7)
 *   Apr 09 – May 08  →  Miazia    (Month 8)
 *   May 09 – Jun 07  →  Ginbot    (Month 9)
 *   Jun 08 – Jul 07  →  Sene      (Month 10)
 *   Jul 08 – Aug 06  →  Hamle     (Month 11)
 *   Aug 07 – Sep 05  →  Nehase    (Month 12)
 *   Sep 06 – Sep 10  →  Pagume    (Month 13)
 */

export interface EthiopicDate {
  month: string;
  year: number;
}

/**
 * Convert a JavaScript Date (Gregorian) to its Ethiopic month name and year.
 * The Date object's LOCAL time components are used (getMonth, getDate, getFullYear).
 * When you need the current Ethiopic date, pass nowInEAT() from ethiopianCalendar.
 */
export function gregorianToEthiopic(date: Date): EthiopicDate {
  const m = date.getMonth() + 1; // 1–12
  const d = date.getDate();
  const y = date.getFullYear();

  // Compute Julian Day Number (Gregorian)
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;

  // Beyene-Kudlek: JDN → Ethiopian year
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const ethYear = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);

  // Ethiopian month name mapping (unchanged)
  let ethMonth: string;
  if      ((m === 9  && d >= 11) || (m === 10 && d <= 10)) ethMonth = 'Meskerem';
  else if ((m === 10 && d >= 11) || (m === 11 && d <=  9)) ethMonth = 'Tikimt';
  else if ((m === 11 && d >= 10) || (m === 12 && d <=  9)) ethMonth = 'Hidar';
  else if ((m === 12 && d >= 10) || (m === 1  && d <=  8)) ethMonth = 'Tahsas';
  else if ((m === 1  && d >=  9) || (m === 2  && d <=  7)) ethMonth = 'Tir';
  else if ((m === 2  && d >=  8) || (m === 3  && d <=  9)) ethMonth = 'Yekatit';
  else if ((m === 3  && d >= 10) || (m === 4  && d <=  8)) ethMonth = 'Megabit';
  else if ((m === 4  && d >=  9) || (m === 5  && d <=  8)) ethMonth = 'Miazia';
  else if ((m === 5  && d >=  9) || (m === 6  && d <=  7)) ethMonth = 'Ginbot';
  else if ((m === 6  && d >=  8) || (m === 7  && d <=  7)) ethMonth = 'Sene';
  else if ((m === 7  && d >=  8) || (m === 8  && d <=  6)) ethMonth = 'Hamle';
  else if ((m === 8  && d >=  7) || (m === 9  && d <=  5)) ethMonth = 'Nehase';
  else                                                       ethMonth = 'Pagume';

  return { month: ethMonth, year: ethYear };
}

/**
 * Returns EthiopicDate for today, using East Africa Time (UTC+3).
 * Importing nowInEAT locally to avoid circular deps between shared/ and utils/.
 */
export function todayEthiopic(): EthiopicDate {
  const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;
  const eatDate = new Date(Date.now() + EAT_OFFSET_MS);
  // eatDate's UTC parts now reflect EAT local time
  const proxy = new Date(
    eatDate.getUTCFullYear(),
    eatDate.getUTCMonth(),
    eatDate.getUTCDate()
  );
  return gregorianToEthiopic(proxy);
}
