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
 */
export function gregorianToEthiopic(date: Date): EthiopicDate {
  const m = date.getMonth() + 1; // 1–12
  const d = date.getDate();
  const y = date.getFullYear();

  // Ethiopian year = Gregorian year - 7 if on/after Sep 11; else - 8
  const isAfterNewYear = m > 9 || (m === 9 && d >= 11);
  const ethYear = isAfterNewYear ? y - 7 : y - 8;

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
  else                                                       ethMonth = 'Pagume'; // Sep 6–10

  return { month: ethMonth, year: ethYear };
}

/**
 * Returns EthiopicDate for today.
 */
export function todayEthiopic(): EthiopicDate {
  return gregorianToEthiopic(new Date());
}
