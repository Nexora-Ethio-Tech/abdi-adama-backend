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
    expect(sequences.slice(-5)).toEqual([43, 44, 45, 46, 47]);
  });

  it('registers files that exist in the authoritative migration directory', () => {
    const missingFiles = STARTUP_MIGRATION_FILES.filter(
      fileName => !fs.existsSync(path.join(migrationsDirectory, fileName))
    );

    expect(missingFiles).toEqual([]);
    expect(STARTUP_MIGRATION_FILES).toContain('44th_create_annual_plans_table.sql');
    expect(STARTUP_MIGRATION_FILES).toContain('45th_enforce_grade_academic_periods.sql');
    expect(STARTUP_MIGRATION_FILES).toContain('46th_enforce_single_active_academic_year.sql');
    expect(STARTUP_MIGRATION_FILES).toContain('47th_create_attendance_time_windows.sql');
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

  it('enforces new grade periods without rewriting legacy rows', () => {
    const sql = fs.readFileSync(
      path.join(migrationsDirectory, '45th_enforce_grade_academic_periods.sql'),
      'utf8'
    );

    expect(sql).toContain('ALTER COLUMN academic_year DROP DEFAULT');
    expect(sql).toContain("'grades'");
    expect(sql).toContain("'grade_submissions'");
    expect(sql).toContain("'grade_submission_locks'");
    expect(sql).toContain('academic_year IS NOT NULL');
    expect(sql).toContain('semester IS NOT NULL AND semester IN (1, 2)');
    expect(sql).toContain(') NOT VALID');
    expect(sql).toContain('CHECK (semester IS NOT NULL AND semester IN (1, 2)) NOT VALID');
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

  it('reconciles duplicate active years and enforces a single active row', () => {
    const sql = fs.readFileSync(
      path.join(migrationsDirectory, '46th_enforce_single_active_academic_year.sql'),
      'utf8'
    );

    expect(sql).toContain('ROW_NUMBER() OVER');
    expect(sql).toContain('active_rank > 1');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_single_active');
    expect(sql).toContain('WHERE is_active = true');
  });
});
