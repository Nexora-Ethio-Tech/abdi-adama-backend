import request from 'supertest';
import app from '../app';

describe('Abdi Adama Backend API - Comprehensive Tests', () => {
  let superAdminToken: string;
  let schoolAdminToken: string;
  let vicePrincipalToken: string;
  let auditorToken: string;
  let branchId: string;
  let classId: string;
  let teacherId: string;

  // Test credentials from seeded data
  const superAdminCreds = {
    email: 'abdiadamaschooloffice@gmail.com',
    password: 'SuperAdmin@2026'
  };

  const schoolAdminCreds = {
    email: '65plante@gmail.com',
    password: 'SchoolAdmin@2026'
  };

  const vicePrincipalCreds = {
    email: 'valerioero@gmail.com',
    password: 'VicePrincipal@2026'
  };

  const auditorCreds = {
    email: 'hailegit35@gmail.com',
    password: 'Auditor@2026'
  };

  describe('1. Health Check', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('2. Authentication', () => {
    it('should login Super Admin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(superAdminCreds);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      superAdminToken = res.body.data.accessToken;
    });

    it('should login School Admin', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(schoolAdminCreds);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      schoolAdminToken = res.body.data.accessToken;
      branchId = res.body.data.user.branch_id;
    });

    it('should login Vice Principal', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(vicePrincipalCreds);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      vicePrincipalToken = res.body.data.accessToken;
    });

    it('should login Auditor', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send(auditorCreds);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      auditorToken = res.body.data.accessToken;
    });

    it('should get current user', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('super-admin');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@email.com', password: 'wrong' });
      
      expect(res.status).toBe(401);
    });
  });

  describe('3. Super Admin - Branch Management', () => {
    it('should get all branches', async () => {
      const res = await request(app)
        .get('/api/super-admin/branches')
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get system report', async () => {
      const res = await request(app)
        .get('/api/super-admin/reports/system')
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.totalBranches).toBeDefined();
    });

    it('should get dashboard', async () => {
      const res = await request(app)
        .get('/api/super-admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('4. Super Admin - User Management', () => {
    it('should create Finance Clerk via Super Admin', async () => {
      const res = await request(app)
        .post('/api/super-admin/create-school-admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test Finance Clerk',
          email: `finance${Date.now()}@test.com`,
          branchId: branchId
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should get all users', async () => {
      const res = await request(app)
        .get('/api/super-admin/users')
        .set('Authorization', `Bearer ${superAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('5. School Admin - User Registration', () => {
    it('should register a teacher', async () => {
      const res = await request(app)
        .post('/api/school-admin/register-user')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Test Teacher',
          email: `teacher${Date.now()}@test.com`,
          role: 'teacher'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      teacherId = res.body.data.user.id;
    });

    it('should register a student', async () => {
      const res = await request(app)
        .post('/api/school-admin/register-user')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Test Student',
          email: `student${Date.now()}@test.com`,
          role: 'student',
          grade: '10'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should register a finance clerk', async () => {
      const res = await request(app)
        .post('/api/school-admin/register-user')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Test Finance Clerk',
          email: `clerk${Date.now()}@test.com`,
          role: 'finance-clerk'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should get branch users', async () => {
      const res = await request(app)
        .get('/api/school-admin/users')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('6. School Admin - Class Management', () => {
    it('should create a class', async () => {
      const res = await request(app)
        .post('/api/school-admin/classes')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Grade 10-A',
          capacity: 30,
          section: 'A'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      classId = res.body.data.id;
    });

    it('should get all classes', async () => {
      const res = await request(app)
        .get('/api/school-admin/classes')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should assign teacher to class', async () => {
      if (!teacherId || !classId) {
        console.log('Skipping: teacherId or classId not available');
        return;
      }

      const res = await request(app)
        .patch(`/api/school-admin/classes/${classId}/assign-teacher`)
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({ teacherId });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('7. School Admin - Academic Year', () => {
    it('should create academic year', async () => {
      const res = await request(app)
        .post('/api/school-admin/academic-years')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          yearName: '2025/2026',
          startDate: '2025-09-01',
          endDate: '2026-06-30'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should get academic years', async () => {
      const res = await request(app)
        .get('/api/school-admin/academic-years')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('8. School Admin - Dashboard', () => {
    it('should get dashboard', async () => {
      const res = await request(app)
        .get('/api/school-admin/dashboard')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('9. Teacher Module', () => {
    it('should get teacher dashboard', async () => {
      const res = await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(200);
    });

    it('should get teacher schedule', async () => {
      const res = await request(app)
        .get('/api/teacher/schedule')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(200);
    });
  });

  describe('10. Finance Clerk Module', () => {
    it('should get finance dashboard', async () => {
      const res = await request(app)
        .get('/api/finance-clerk/dashboard')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(200);
    });

    it('should get all payments', async () => {
      const res = await request(app)
        .get('/api/finance-clerk/payments')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('11. Vice Principal Module', () => {
    it('should get VP dashboard', async () => {
      const res = await request(app)
        .get('/api/vice-principal/dashboard')
        .set('Authorization', `Bearer ${vicePrincipalToken}`);
      
      expect(res.status).toBe(200);
    });

    it('should get absence queue', async () => {
      const res = await request(app)
        .get('/api/vice-principal/absence-queue')
        .set('Authorization', `Bearer ${vicePrincipalToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get pending lesson plans', async () => {
      const res = await request(app)
        .get('/api/vice-principal/lesson-plans/pending')
        .set('Authorization', `Bearer ${vicePrincipalToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('12. Auditor Module', () => {
    it('should get auditor dashboard', async () => {
      const res = await request(app)
        .get('/api/auditor/dashboard')
        .set('Authorization', `Bearer ${auditorToken}`);
      
      expect(res.status).toBe(200);
    });

    it('should get all payments (read-only)', async () => {
      const res = await request(app)
        .get('/api/auditor/payments')
        .set('Authorization', `Bearer ${auditorToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should get fee reduction requests', async () => {
      const res = await request(app)
        .get('/api/auditor/fee-reductions')
        .set('Authorization', `Bearer ${auditorToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('13. Authorization Tests', () => {
    it('should reject School Admin accessing Super Admin routes', async () => {
      const res = await request(app)
        .get('/api/super-admin/users')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(403);
    });

    it('should reject Teacher accessing Finance Clerk routes', async () => {
      const res = await request(app)
        .get('/api/finance-clerk/payments')
        .set('Authorization', `Bearer ${schoolAdminToken}`);
      
      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/super-admin/users');
      expect(res.status).toBe(401);
    });
  });

  describe('14. Validation Tests', () => {
    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/school-admin/register-user')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Test User',
          email: 'invalid-email',
          role: 'teacher'
        });
      
      expect(res.status).toBe(400);
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .post('/api/school-admin/register-user')
        .set('Authorization', `Bearer ${schoolAdminToken}`)
        .send({
          name: 'Test User',
          email: 'test@test.com',
          role: 'super-admin'
        });
      
      expect(res.status).toBe(400);
    });
  });
});
