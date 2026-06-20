import { describe, expect, it, jest } from '@jest/globals';

jest.mock('expo-crypto', () => ({
  randomUUID: () => '550e8400-e29b-41d4-a716-446655440000',
}));

import { generateUUID, isValidUUID } from '@/lib/utils/uuid';

describe('uuid utilities', () => {
  it('generates UUIDs through expo-crypto', () => {
    expect(generateUUID()).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('validates UUID-shaped strings', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects invalid UUID input', () => {
    expect(isValidUUID('invalid-uuid')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID(null as unknown as string)).toBe(false);
  });
});
