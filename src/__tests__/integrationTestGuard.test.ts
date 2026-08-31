import {
  assertSafeIntegrationTestEnvironment,
  getIntegrationTestCredentials,
  integrationTestsEnabled,
} from '../testUtils/integrationTestGuard';

const safeEnvironment = (): NodeJS.ProcessEnv => ({
  RUN_INTEGRATION_TESTS: 'true',
  NODE_ENV: 'test',
  DB_HOST: '127.0.0.1',
  DB_NAME: 'abdi_adama_test',
  TEST_DATABASE_HOST_ALLOWLIST: 'localhost,127.0.0.1',
  TEST_DATABASE_NAME_ALLOWLIST: 'abdi_adama_test',
});

describe('integration test safety guard', () => {
  it('is disabled unless explicitly opted in', () => {
    expect(integrationTestsEnabled({})).toBe(false);
    expect(() => assertSafeIntegrationTestEnvironment({})).toThrow(
      'RUN_INTEGRATION_TESTS=true'
    );
  });

  it('rejects a non-test runtime', () => {
    expect(() => assertSafeIntegrationTestEnvironment({
      ...safeEnvironment(),
      NODE_ENV: 'production',
    })).toThrow('NODE_ENV=test');
  });

  it('rejects a database host or name outside the exact allowlists', () => {
    expect(() => assertSafeIntegrationTestEnvironment({
      ...safeEnvironment(),
      DB_HOST: 'production-db.internal',
    })).toThrow('DB_HOST is not in TEST_DATABASE_HOST_ALLOWLIST');

    expect(() => assertSafeIntegrationTestEnvironment({
      ...safeEnvironment(),
      DB_NAME: 'abdi_adama_production',
    })).toThrow('DB_NAME is not in TEST_DATABASE_NAME_ALLOWLIST');
  });

  it('accepts an explicitly enabled and allowlisted test database', () => {
    expect(() => assertSafeIntegrationTestEnvironment(safeEnvironment())).not.toThrow();
  });

  it('requires test credentials from the environment', () => {
    expect(() => getIntegrationTestCredentials('TEST_SCHOOL_ADMIN', {})).toThrow(
      'TEST_SCHOOL_ADMIN_EMAIL is required'
    );

    expect(getIntegrationTestCredentials('TEST_SCHOOL_ADMIN', {
      TEST_SCHOOL_ADMIN_EMAIL: 'admin@example.test',
      TEST_SCHOOL_ADMIN_PASSWORD: 'provided-at-runtime',
    })).toEqual({
      email: 'admin@example.test',
      password: 'provided-at-runtime',
    });
  });
});
