import { requireEnvironmentValue, safeSecretMatches } from '../utils/secureConfig';

describe('secure runtime configuration', () => {
  it('requires a non-empty environment value', () => {
    expect(() => requireEnvironmentValue('REQUIRED_SECRET', {})).toThrow(
      'REQUIRED_SECRET is required'
    );
    expect(requireEnvironmentValue('REQUIRED_SECRET', {
      REQUIRED_SECRET: ' configured ',
    })).toBe('configured');
  });

  it('matches secrets without accepting missing or different values', () => {
    expect(safeSecretMatches('machine-secret', 'machine-secret')).toBe(true);
    expect(safeSecretMatches('machine-secret', 'machine-other')).toBe(false);
    expect(safeSecretMatches('machine-secret')).toBe(false);
  });
});
