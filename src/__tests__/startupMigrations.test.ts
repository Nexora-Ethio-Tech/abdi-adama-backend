import fs from 'fs';
import path from 'path';
import {
  STARTUP_MIGRATION_FILES,
  getMigrationSequence,
  validateStartupMigrationManifest,
} from '../config/startupMigrations';

const migrationsDirectory = path.resolve(__dirname, '../../database/newmigrations');

describe('startup migration manifest', () => {
  it('contains unique, monotonically increasing migration sequences', () => {
    expect(() => validateStartupMigrationManifest()).not.toThrow();

    const sequences = STARTUP_MIGRATION_FILES.map(getMigrationSequence);
    expect(sequences[sequences.length - 2]).toBe(43);
    expect(sequences[sequences.length - 1]).toBe(44);
  });

  it('registers files that exist in the authoritative migration directory', () => {
    const missingFiles = STARTUP_MIGRATION_FILES.filter(
      fileName => !fs.existsSync(path.join(migrationsDirectory, fileName))
    );

    expect(missingFiles).toEqual([]);
    expect(STARTUP_MIGRATION_FILES).toContain('44th_create_annual_plans_table.sql');
  });

  it('has no duplicate numbered SQL files in the authoritative directory', () => {
    const migrationFiles = fs.readdirSync(migrationsDirectory)
      .filter(fileName => fileName.endsWith('.sql'));
    const sequences = migrationFiles.map(fileName => ({
      fileName,
      sequence: getMigrationSequence(fileName),
    }));
    const unnumberedFiles = sequences.filter(({ sequence }) => sequence === null);
    const counts = new Map<number, string[]>();

    for (const { fileName, sequence } of sequences) {
      if (sequence === null) continue;
      counts.set(sequence, [...(counts.get(sequence) || []), fileName]);
    }

    const duplicates = [...counts.entries()].filter(([, files]) => files.length > 1);
    expect(unnumberedFiles).toEqual([]);
    expect(duplicates).toEqual([]);
  });

  it('rejects duplicate or out-of-order manifests', () => {
    expect(() => validateStartupMigrationManifest([
      '43rd_first.sql',
      '43rd_duplicate.sql',
    ])).toThrow('Duplicate migration sequence 43');

    expect(() => validateStartupMigrationManifest([
      '44th_later.sql',
      '43rd_earlier.sql',
    ])).toThrow('out of order');
  });
});
