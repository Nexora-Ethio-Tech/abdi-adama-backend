import {
  databaseUnavailableResponse,
  isDatabaseAvailabilityError,
} from '../utils/publicError';

describe('public database error handling', () => {
  it('recognizes PostgreSQL connection exhaustion without relying on message text', () => {
    expect(isDatabaseAvailabilityError({ code: '53300' })).toBe(true);
  });

  it('recognizes the PostgreSQL reserved-slot message', () => {
    expect(isDatabaseAvailabilityError({
      message: 'remaining connection slots are reserved for non-replication superuser connections',
    })).toBe(true);
  });

  it('does not classify normal application validation errors as outages', () => {
    expect(isDatabaseAvailabilityError({ message: 'Current password is incorrect' })).toBe(false);
  });

  it('returns a generic retryable message without database internals', () => {
    expect(databaseUnavailableResponse).toEqual({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'The service is temporarily unavailable. Please try again shortly.',
    });
  });
});
