const mockConnect = jest.fn();
const mockPoolQuery = jest.fn();

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    connect: mockConnect,
    query: mockPoolQuery,
  },
}));

jest.mock('../services/schoolAdmin.service', () => ({
  syncSchoolCalendarForEvent: jest.fn(),
}));

import superAdminService from '../services/superAdmin.service';

const yearId = '00000000-0000-4000-8000-000000000046';
const userId = '00000000-0000-4000-8000-000000000001';

const makeClient = (targetExists = true) => {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('SELECT id') && sql.includes('FROM academic_years')) {
      return { rows: targetExists ? [{ id: yearId }] : [] };
    }
    if (sql.includes('RETURNING *')) {
      return { rows: [{ id: yearId, is_active: true }] };
    }
    return { rows: [] };
  });
  return { query, release: jest.fn() };
};

describe('atomic academic year activation', () => {
  afterEach(() => jest.clearAllMocks());

  it('rejects malformed IDs before opening a database transaction', async () => {
    await expect(
      superAdminService.activateGlobalAcademicYear('not-a-uuid', userId)
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_ACADEMIC_YEAR_ID',
    });

    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('validates the target before deactivating the current year', async () => {
    const client = makeClient(false);
    mockConnect.mockResolvedValue(client);

    await expect(
      superAdminService.activateGlobalAcademicYear(yearId, userId)
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'ACADEMIC_YEAR_NOT_FOUND',
    });

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) =>
      String(sql).includes('SET is_active = false')
    )).toBe(false);
    expect(client.release).toHaveBeenCalled();
  });

  it('serializes, switches, and synchronizes the active year in one transaction', async () => {
    const client = makeClient(true);
    mockConnect.mockResolvedValue(client);

    await expect(
      superAdminService.activateGlobalAcademicYear(yearId, userId)
    ).resolves.toMatchObject({ id: yearId, is_active: true });

    const calls = client.query.mock.calls.map(([sql]) => String(sql));
    expect(calls[0]).toBe('BEGIN');
    expect(calls.some(sql => sql.includes('pg_advisory_xact_lock'))).toBe(true);
    expect(calls.some(sql => sql.includes('SET is_active = false'))).toBe(true);
    expect(calls.some(sql => sql.includes("VALUES ('active_academic_year_id'"))).toBe(true);
    expect(calls[calls.length - 1]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('does not let the general settings endpoint bypass atomic activation', async () => {
    mockPoolQuery.mockResolvedValue({ rows: [] });

    await superAdminService.updateSystemSettings({
      active_academic_year_id: yearId,
    }, userId);

    expect(mockPoolQuery.mock.calls.some(([sql]) =>
      String(sql).includes("VALUES ('active_academic_year_id'")
    )).toBe(false);
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
    expect(String(mockPoolQuery.mock.calls[0][0])).toContain('SELECT key, value FROM system_settings');
  });
});
