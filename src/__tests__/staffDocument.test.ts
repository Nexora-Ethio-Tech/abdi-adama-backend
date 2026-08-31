import request from 'supertest';
import type { Express } from 'express';
import {
  assertSafeIntegrationTestEnvironment,
  getIntegrationTestCredentials,
  integrationTestsEnabled,
} from '../testUtils/integrationTestGuard';

const describeIntegration = integrationTestsEnabled() ? describe : describe.skip;

describeIntegration('Staff Document Upload & Re-upload APIs', () => {
  let app: Express;
  let schoolAdminToken: string;

  beforeAll(async () => {
    assertSafeIntegrationTestEnvironment();
    app = require('../app').default;
    const schoolAdminCreds = getIntegrationTestCredentials('TEST_SCHOOL_ADMIN');
    const adminRes = await request(app).post('/api/auth/login').send(schoolAdminCreds);
    if (adminRes.status !== 200 || !adminRes.body.data?.accessToken) {
      throw new Error(`Integration-test login failed for school admin with status ${adminRes.status}`);
    }
    schoolAdminToken = adminRes.body.data.accessToken;
  });

  it('should reject staff registration if document file is missing', async () => {
    const res = await request(app)
      .post('/api/school-admin/register-user')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .send({
        name: 'Mandatory Doc Teacher',
        email: `teachermandatory${Date.now()}@test.com`,
        role: 'teacher',
        staffProfile: {
          phoneNumber: '+251911111111',
          emergencyContactName: 'Contact Person',
          emergencyContactPhone: '+251922222222',
          educationLevel: 'Degree',
          specialty: 'Mathematics',
          dob: '2000-01-01',
          previousSchool: 'Old School',
          experienceYears: '5'
        }
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Document upload is mandatory');
  });

  it('should successfully register a staff member when document is provided', async () => {
    const mockFileBuffer = Buffer.from('mock pdf content');

    const res = await request(app)
      .post('/api/school-admin/register-user')
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .attach('file', mockFileBuffer, { filename: 'test-resume.pdf', contentType: 'application/pdf' })
      .field('name', 'Doc Verified Teacher')
      .field('email', `teacherdoc${Date.now()}@test.com`)
      .field('role', 'teacher')
      .field('staffProfile', JSON.stringify({
        phoneNumber: '+251911111111',
        emergencyContactName: 'Contact Person',
        emergencyContactPhone: '+251922222222',
        educationLevel: 'Degree',
        specialty: 'Mathematics',
        dob: '2000-01-01',
        previousSchool: 'Old School',
        experienceYears: '5'
      }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBeDefined();

    const staffId = res.body.data.user.id;

    // View/Download Document test
    const viewRes = await request(app)
      .get(`/api/school-admin/users/${staffId}/document`)
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(viewRes.status).toBe(200);
    expect(viewRes.header['content-type']).toBe('application/pdf');

    // Re-upload/Edit Document test
    const newMockFileBuffer = Buffer.from('updated mock pdf content');

    const updateRes = await request(app)
      .post(`/api/school-admin/users/${staffId}/document`)
      .set('Authorization', `Bearer ${schoolAdminToken}`)
      .attach('file', newMockFileBuffer, { filename: 'updated-resume.pdf', contentType: 'application/pdf' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.document_file_name).toBe('updated-resume.pdf');

    // Verify view returns the updated content
    const updatedViewRes = await request(app)
      .get(`/api/school-admin/users/${staffId}/document`)
      .set('Authorization', `Bearer ${schoolAdminToken}`);

    expect(updatedViewRes.status).toBe(200);
    expect(updatedViewRes.body.toString()).toBe('updated mock pdf content');
  });
});
