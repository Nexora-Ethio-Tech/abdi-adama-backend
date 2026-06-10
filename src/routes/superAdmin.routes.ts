import { Router, Request, Response, NextFunction } from 'express';
import superAdminController from '../controllers/superAdmin.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate, schemas } from '../middleware/validator';
import { UserRole } from '../types';
import Joi from 'joi';

const router = Router();

router.use(authenticate);

// Validation schemas
const branchSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  logoUrl: Joi.string().uri().allow(''),
  phone: Joi.string().allow(''),
  email: Joi.string().email().allow(''),
  address: Joi.string().allow(''),
  profile_image: Joi.string().uri().allow('')
});

const academicYearSchema = Joi.object({
  yearName: Joi.string().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required()
});

const capacitySchema = Joi.object({
  capacity: Joi.number().integer().min(0).required()
});

const systemSettingsSchema = Joi.object({
  school_name_oromic: Joi.string().allow('').optional(),
  school_name_amharic: Joi.string().allow('').optional(),
  school_name_english: Joi.string().allow('').optional(),
  school_motto_oromic: Joi.string().allow('').optional(),
  school_motto_amharic: Joi.string().allow('').optional(),
  school_motto_english: Joi.string().allow('').optional(),
  system_email: Joi.string().email().allow('').optional(),
  phone: Joi.string().allow('').optional(),
  address: Joi.string().allow('').optional(),
  grades_locked: Joi.string().valid('true', 'false').optional(),
  registration_open: Joi.string().valid('true', 'false').optional(),
  active_academic_year_id: Joi.alternatives().try(Joi.string().uuid(), Joi.string().valid(''), Joi.valid(null)).optional(),
});

// SMTP settings schema with example placeholders for the Super Admin settings UI
const smtpSettingsSchema = Joi.object({
  smtp_host: Joi.string().hostname().required().example('smtp.gmail.com'),
  smtp_port: Joi.number().integer().min(1).max(65535).required().example(587),
  smtp_user: Joi.string().email().required().example('abdiadamaschooloffice@gmail.com'),
  smtp_from: Joi.string().required().example('Abdi Adama School IMS <abdiadamaschooloffice@gmail.com>').custom((value, helpers) => {
    const emailOnly = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const displayNameWithEmail = /^.+<[^<>@\s]+@[^<>@\s]+\.[^<>@\s]+>$/;
    if (emailOnly.test(value) || displayNameWithEmail.test(value)) {
      return value;
    }
    return helpers.error('any.invalid');
  }, 'SMTP from address validation'),
  smtp_pass: Joi.string().allow('').optional().example('gdgg eify uzec fhox'),
});

const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  role: Joi.string().required(),
  branchId: Joi.string().uuid().optional(),
  phone: Joi.string().allow('').optional(),
});

const branchGradeFeeSchema = Joi.object({
  branchId: Joi.string().uuid().required(),
  gradeLevel: Joi.string().required(),
  monthlyFee: Joi.number().min(0).required(),
  registrationFee: Joi.number().min(0).required(),
  busFee: Joi.number().min(0).required(),
});

const profitTargetSchema = Joi.object({
  branchId: Joi.string().uuid().required(),
  ethiopianMonth: Joi.number().integer().min(1).max(13).required(),
  targetAmount: Joi.number().required(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
});

// Read-only School Admin endpoints
router.get('/finance-settings', roleGuard([UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]), superAdminController.getFinanceSettings);
router.get('/finance-settings/audit-log', roleGuard([UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]), superAdminController.getFinanceSettingsAuditLog);
router.get('/branch-grade-fees', roleGuard([UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]), superAdminController.getBranchGradeFees);
router.get('/profit-targets/branch-summary', roleGuard([UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]), superAdminController.getBranchProfitSummary);
router.get('/profit-targets', roleGuard([UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]), superAdminController.getMonthlyProfitTargets);

// Secure super-admin-only endpoints
router.use(roleGuard([UserRole.SUPER_ADMIN]));

// User Management
const normalizeBranchForAuditor = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const v = req.body?.branchId;
    if (v === undefined || v === null || v === '') {
      req.body.branchId = null;
    } else if (typeof v !== 'string') {
      req.body.branchId = null;
    }
  } catch (err) {
    req.body.branchId = null;
  }
  next();
};

router.post('/create-school-admin', validate(schemas.createAdminUser), superAdminController.createSchoolAdmin);
router.post('/create-vice-principal', validate(schemas.createAdminUser), superAdminController.createVicePrincipal);
router.post('/create-auditor', normalizeBranchForAuditor, validate(schemas.createAuditorUser), superAdminController.createAuditor);
router.post('/users', validate(createUserSchema), superAdminController.createUser);
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:id', superAdminController.getUserById);
router.post('/users/:id', validate(schemas.updateUser), superAdminController.updateUser);
router.post('/users/:id/status', validate(schemas.updateUserStatus), superAdminController.updateUserStatus);
router.post('/users/:id/reset-pin', superAdminController.resetUserPIN);
router.delete('/users/:id', superAdminController.deleteUser);

// Branch Management
router.post('/branches', validate(branchSchema), superAdminController.createBranch);
router.get('/branches', superAdminController.getBranches);
router.get('/branches/:id', superAdminController.getBranchById);
router.post('/branches/:id', superAdminController.updateBranch);
router.delete('/branches/:id', superAdminController.deleteBranch);

// System Reports
router.get('/reports/system', superAdminController.getSystemReport);
router.get('/reports/branch/:id', superAdminController.getBranchReport);
router.get('/analytics', superAdminController.getAnalytics);

// Academic Year Management
router.post('/academic-years', validate(academicYearSchema), superAdminController.createGlobalAcademicYear);
router.get('/academic-years', superAdminController.getGlobalAcademicYears);
router.post('/academic-years/:id/activate', superAdminController.activateGlobalAcademicYear);

// Class Capacity
router.post('/classes/:id/capacity', validate(capacitySchema), superAdminController.setClassCapacity);

// Dashboard
router.get('/dashboard', superAdminController.getDashboard);

// Finance Settings Management
router.post('/finance-settings/:key', superAdminController.updateFinanceSetting);

// Branch-based finance endpoints
router.post('/branch-grade-fees', validate(branchGradeFeeSchema), superAdminController.upsertBranchGradeFee);
router.delete('/branch-grade-fees/:id', superAdminController.deleteBranchGradeFee);

router.post('/profit-targets', validate(profitTargetSchema), superAdminController.upsertMonthlyProfitTarget);

// SMTP / Email Settings Management
const smtpTestSchema = Joi.object({
  email: Joi.string().email().required()
});

router.get('/smtp-settings', superAdminController.getSmtpSettings);
router.put('/smtp-settings', validate(smtpSettingsSchema), superAdminController.updateSmtpSettings);
router.post('/smtp-settings/test', validate(smtpTestSchema), superAdminController.testSmtpSettings);

// System settings (branding, contact, global flags)
router.get('/system-settings', superAdminController.getSystemSettings);
router.put('/system-settings', validate(systemSettingsSchema), superAdminController.updateSystemSettings);

// Events Calendar
router.get('/events', superAdminController.getEvents);
router.post('/events', superAdminController.createEvent);
router.post('/events/:id', superAdminController.updateEvent);
router.delete('/events/:id', superAdminController.deleteEvent);


/* ==========================================
   SECURE CHATBOT KNOWLEDGE BASE PROXY ROUTES
   ========================================== */

const HF_BASE = "https://kaleabbelayhun-abdiragbackend.hf.space";

// Helper to construct headers containing backend-only credentials
const getProxyHeaders = (requiresAdmin = false) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.HF_TOKEN}`
  };
  if (requiresAdmin) {
    headers['X-Admin-Token'] = process.env.SUPER_ADMIN_TOKEN || "";
  }
  return headers;
};

// GET /api/super-admin/chatbot/docs -> Proxies to GET /getdocs
router.get('/chatbot/docs', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${HF_BASE}/getdocs`, {
      method: 'GET',
      headers: getProxyHeaders(false)
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("Chatbot docs fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch document structure from assistant Space." });
  }
});

// POST /api/super-admin/chatbot/docs -> Proxies to POST /postdocs
router.post('/chatbot/docs', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const response = await fetch(`${HF_BASE}/postdocs`, {
      method: 'POST',
      headers: getProxyHeaders(true),
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("Chatbot docs create error:", err);
    return res.status(500).json({ error: "Failed to add document to assistant Space." });
  }
});

// PUT /api/super-admin/chatbot/docs/:id -> Proxies to PUT /docs/:id
router.put('/chatbot/docs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const response = await fetch(`${HF_BASE}/docs/${id}`, {
      method: 'PUT',
      headers: getProxyHeaders(true),
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Chatbot docs edit error:", err);
    return res.status(500).json({ error: "Failed to update document in assistant Space." });
  }
});

// DELETE /api/super-admin/chatbot/docs/:id -> Proxies to DELETE /docs/:id
router.delete('/chatbot/docs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await fetch(`${HF_BASE}/docs/${id}`, {
      method: 'DELETE',
      headers: getProxyHeaders(true)
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Chatbot docs delete error:", err);
    return res.status(500).json({ error: "Failed to delete document from assistant Space." });
  }
});

// DELETE /api/super-admin/chatbot/docs -> Proxies to DELETE /docs (Clear All)
router.delete('/chatbot/docs', async (req: Request, res: Response) => {
  try {
    const response = await fetch(`${HF_BASE}/docs`, {
      method: 'DELETE',
      headers: getProxyHeaders(true)
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("Chatbot docs clear error:", err);
    return res.status(500).json({ error: "Failed to clear documents from assistant Space." });
  }
});

export default router;