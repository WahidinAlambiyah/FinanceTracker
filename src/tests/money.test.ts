import { describe, expect, it } from '@jest/globals';

import {
  formatAmountOnly,
  formatRupiah,
  isValidAmount,
  parseRupiahInput,
  validateAndParseAmount,
} from '@/lib/utils/money';

const normalizeSpaces = (value: string) => value.replace(/\s+/g, ' ');

describe('money utilities', () => {
  it('formats Rupiah amounts and invalid input safely', () => {
    expect(normalizeSpaces(formatRupiah(10000))).toBe('Rp 10.000');
    expect(normalizeSpaces(formatRupiah(0))).toBe('Rp 0');
    expect(normalizeSpaces(formatRupiah(Number.NaN))).toBe('Rp 0');
  });

  it('formats amount-only values', () => {
    expect(formatAmountOnly(10000)).toBe('10.000');
    expect(formatAmountOnly(Number.NaN)).toBe('0');
  });

  it('parses supported Rupiah input formats', () => {
    expect(parseRupiahInput('10000')).toBe(10000);
    expect(parseRupiahInput('Rp 10.000')).toBe(10000);
    expect(parseRupiahInput('10k')).toBe(10000);
    expect(parseRupiahInput('10rb')).toBe(10000);
    expect(parseRupiahInput('1.5jt')).toBe(1500000);
    expect(parseRupiahInput('1,5jt')).toBe(1500000);
    expect(parseRupiahInput('not an amount')).toBeNull();
  });

  it('validates stored integer amounts', () => {
    expect(isValidAmount(10000)).toBe(true);
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-10000)).toBe(false);
    expect(isValidAmount(10000.5)).toBe(false);
    expect(isValidAmount(Number.NaN)).toBe(false);
  });

  it('validates parsed user amount input', () => {
    expect(validateAndParseAmount('Rp 10.000')).toBe(10000);
    expect(validateAndParseAmount('0')).toBeNull();
    expect(validateAndParseAmount('-10000')).toBeNull();
    expect(validateAndParseAmount('not an amount')).toBeNull();
  });
});
