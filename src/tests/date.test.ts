import { describe, expect, it } from '@jest/globals';

import {
  formatIndonesianDate,
  formatShortDate,
  fromISOString,
  getMonthRange,
  getTodayStart,
  toISOString,
} from '@/lib/utils/date';

const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('date utilities', () => {
  it('converts Date objects to ISO strings', () => {
    const date = new Date('2024-06-04T10:30:45.123Z');

    expect(toISOString(date)).toBe('2024-06-04T10:30:45.123Z');
  });

  it('parses valid ISO strings and rejects invalid input', () => {
    expect(fromISOString('2024-06-04T10:30:45.123Z')?.toISOString()).toBe(
      '2024-06-04T10:30:45.123Z'
    );
    expect(fromISOString('invalid date')).toBeNull();
    expect(fromISOString('')).toBeNull();
  });

  it('formats fixed local dates for Indonesian display', () => {
    const date = new Date(2024, 5, 4);

    expect(formatIndonesianDate(date)).toBe('4 Juni 2024');
    expect(formatShortDate(date)).toBe('04/06/2024');
  });

  it('returns valid ordered ISO strings for a month range', () => {
    const range = getMonthRange(2024, 6);

    expect(range.startDate).toMatch(isoPattern);
    expect(range.endDate).toMatch(isoPattern);
    expect(new Date(range.startDate).getTime()).toBeLessThan(
      new Date(range.endDate).getTime()
    );
  });

  it('returns an ISO-shaped value for today start', () => {
    expect(getTodayStart()).toMatch(isoPattern);
  });
});
