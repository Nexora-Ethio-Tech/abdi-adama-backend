import { requireEnvironmentValue } from '../utils/secureConfig';

const parseAllowlist = (value: string): string[] =>
  value.split(',').map(item => item.trim()).filter(Boolean);

export function integrationTestsEnabled(
  environment: NodeJS.ProcessEnv = process.env
): boolean {
  return environment.RUN_INTEGRATION_TESTS === 'true';
}

export function assertSafeIntegrationTestEnvironment(
  environment: NodeJS.ProcessEnv = process.env
): void {
  if (!integrationTestsEnabled(environment)) {
    throw new Error('Integration tests require RUN_INTEGRATION_TESTS=true');
  }

  if (environment.NODE_ENV !== 'test') {
    throw new Error('Integration tests require NODE_ENV=test');
  }

  const databaseHost = requireEnvironmentValue('DB_HOST', environment);
  const databaseName = requireEnvironmentValue('DB_NAME', environment);
  const allowedHosts = parseAllowlist(
    requireEnvironmentValue('TEST_DATABASE_HOST_ALLOWLIST', environment)
  );
  const allowedNames = parseAllowlist(
    requireEnvironmentValue('TEST_DATABASE_NAME_ALLOWLIST', environment)
  );

  if (!allowedHosts.includes(databaseHost)) {
    throw new Error(`DB_HOST is not in TEST_DATABASE_HOST_ALLOWLIST: ${databaseHost}`);
  }

  if (!allowedNames.includes(databaseName)) {
    throw new Error(`DB_NAME is not in TEST_DATABASE_NAME_ALLOWLIST: ${databaseName}`);
  }
}

export function getIntegrationTestCredentials(
  prefix: string,
  environment: NodeJS.ProcessEnv = process.env
): { email: string; password: string } {
  return {
    email: requireEnvironmentValue(`${prefix}_EMAIL`, environment),
    password: requireEnvironmentValue(`${prefix}_PASSWORD`, environment),
  };
}
