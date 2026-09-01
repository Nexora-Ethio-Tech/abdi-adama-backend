interface ErrorLike {
  code?: string;
  message?: string;
}

const DATABASE_AVAILABILITY_CODES = new Set([
  '53300', // too_many_connections
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENETUNREACH',
  'ETIMEDOUT',
]);

const DATABASE_AVAILABILITY_MESSAGE =
  /remaining connection slots|too many (?:clients|connections)|connection terminated unexpectedly|connect econnrefused|timeout exceeded when trying to connect|the database system is (?:starting up|shutting down|in recovery mode)/i;

export const isDatabaseAvailabilityError = (error: ErrorLike): boolean => {
  const code = String(error.code || '').toUpperCase();
  if (DATABASE_AVAILABILITY_CODES.has(code) || code.startsWith('08')) return true;
  return DATABASE_AVAILABILITY_MESSAGE.test(error.message || '');
};

export const databaseUnavailableResponse = {
  status: 503,
  code: 'SERVICE_UNAVAILABLE',
  message: 'The service is temporarily unavailable. Please try again shortly.',
} as const;
