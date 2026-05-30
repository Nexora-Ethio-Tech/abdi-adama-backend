import { gregorianToEthiopian, type EthiopianDateParts } from '../shared/ethiopianCalendar';

/** Africa/Addis_Ababa offset (+3, no DST). */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

export type VotingCycleInfo = {
  cycleKey: string;
  ethiopianStart: EthiopianDateParts;
  isOpen: boolean;
  /** Gregorian ISO date (YYYY-MM-DD) of the Saturday that opened this cycle. */
  saturdayIso: string;
};

export const toAddisAbabaDate = (date: Date = new Date()): Date => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60_000;
  return new Date(utc + EAT_OFFSET_MS);
};

const formatIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Teacher-of-the-week voting window (Ethiopian calendar week):
 * Opens Saturday 00:00 EAT, closes after Wednesday 23:59 EAT (5 days).
 * Hidden Thursday and Friday.
 */
export const getCurrentVotingCycle = (now: Date = new Date()): VotingCycleInfo => {
  const eat = toAddisAbabaDate(now);
  const dayOfWeek = eat.getDay(); // 0=Sun … 6=Sat

  const isOpen = dayOfWeek === 6 || dayOfWeek === 0 || dayOfWeek <= 3;
  const daysSinceSaturday = dayOfWeek === 6 ? 0 : dayOfWeek + 1;

  const saturday = new Date(eat);
  saturday.setDate(saturday.getDate() - daysSinceSaturday);
  saturday.setHours(0, 0, 0, 0);

  const ethiopianStart = gregorianToEthiopian(saturday);
  const cycleKey = `${ethiopianStart.year}-${String(ethiopianStart.month).padStart(2, '0')}-${String(ethiopianStart.day).padStart(2, '0')}`;

  return {
    cycleKey,
    ethiopianStart,
    isOpen,
    saturdayIso: formatIsoDate(saturday),
  };
};
