import { timingSafeEqual } from 'crypto';

export function requireEnvironmentValue(
  name: string,
  environment: NodeJS.ProcessEnv = process.env
): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function safeSecretMatches(expected: string, supplied?: string): boolean {
  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (expectedBuffer.length !== suppliedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}
