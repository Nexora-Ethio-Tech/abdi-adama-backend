import fs from 'fs';
import path from 'path';

const source = (relativePath: string) => fs.readFileSync(
  path.resolve(__dirname, '..', relativePath),
  'utf8'
);

describe('legacy VP grade lock retirement', () => {
  it('does not consult the old grade-level lock table during teacher grade writes', () => {
    expect(source('services/teacher.service.ts')).not.toContain('FROM grade_locks');
  });

  it('does not expose legacy grade-lock mutations from the VP service', () => {
    const service = source('services/vicePrincipal.service.ts');
    expect(service).not.toContain('getGradeLocks');
    expect(service).not.toContain('toggleGradeLock');
    expect(service).not.toContain('INSERT INTO grade_locks');
  });

  it('keeps old API paths as explicit gone responses for stale clients', () => {
    const routes = source('routes/vicePrincipal.routes.ts');
    const controller = source('controllers/vicePrincipal.controller.ts');

    expect(routes.match(/gradeLocksRetired/g)).toHaveLength(2);
    expect(controller).toContain("code: 'LEGACY_GRADE_LOCKS_RETIRED'");
    expect(controller).toContain('res.status(410)');
    expect(controller).toContain('assessment-scoped submission and unlock controls');
  });
});
