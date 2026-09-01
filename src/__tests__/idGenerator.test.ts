import { generateDigitalId } from '../utils/idGenerator';
import { UserRole } from '../types';

describe('database-backed Digital ID generation', () => {
  it('uses one supplied transaction client and a cross-process advisory lock', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ name: 'Adama Branch', code: null }] })
      .mockResolvedValueOnce({ rows: [{ digital_id: 'ADM-AD-0001' }] })
      .mockResolvedValueOnce({ rows: [] });

    const digitalId = await generateDigitalId(
      UserRole.SCHOOL_ADMIN,
      'branch-id',
      { query } as any
    );

    expect(digitalId).toBe('ADM-AD-0002');
    expect(query).toHaveBeenNthCalledWith(
      1,
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      ['digital-id', 'school-admin:branch-id']
    );
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('advances past an existing candidate while holding the same lock', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ digital_id: 'SA-002' }] })
      .mockResolvedValueOnce({ rows: [{ exists: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const digitalId = await generateDigitalId(
      UserRole.SUPER_ADMIN,
      null,
      { query } as any
    );

    expect(digitalId).toBe('SA-004');
    expect(query).toHaveBeenCalledTimes(4);
  });
});
