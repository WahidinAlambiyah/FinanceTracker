import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { logger } from '@/lib/utils/logger';

describe('logger safety', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redacts sensitive object fields and preserves safe fields', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.info('User authenticated', {
      userId: 'user-123',
      password: 'secret-password',
      nested: {
        accessToken: 'token-value',
        displayName: 'Wahid',
      },
    });

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy.mock.calls[1][0]).toEqual({
      userId: 'user-123',
      password: '[REDACTED]',
      nested: {
        accessToken: '[REDACTED]',
        displayName: 'Wahid',
      },
    });
  });

  it('redacts sensitive patterns in message strings', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.info('token=abc123 password=hunter2 secret=topsecret');

    const message = String(logSpy.mock.calls[0][0]);
    expect(message).toContain('token: [REDACTED]');
    expect(message).toContain('password: [REDACTED]');
    expect(message).toContain('secret: [REDACTED]');
    expect(message).not.toContain('abc123');
    expect(message).not.toContain('hunter2');
    expect(message).not.toContain('topsecret');
  });

  it('sanitizes Error messages before logging', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.error('Sync failed', new Error('authorization: bearer sensitive-token'));

    const errorMessage = String(errorSpy.mock.calls[1][0]);
    expect(errorMessage).toBe('authorization: [REDACTED]');
    expect(errorMessage).not.toContain('sensitive-token');
  });

  it('logs only safe metadata for financial debug entries', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.financial('Transaction created', 'expense', {
      id: 'tx-123',
      type: 'expense',
      amount: 50000,
      note: 'Private note',
      status: 'pending',
    });

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy.mock.calls[1][0]).toEqual({
      id: 'tx-123',
      type: 'expense',
      status: 'pending',
    });
  });
});
