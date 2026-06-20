import { describe, expect, it } from '@jest/globals';

describe('test runner smoke', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });
});
