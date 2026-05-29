import { Router } from 'express';
import superAdminController from '../controllers/superAdmin.controller';
import { authenticate } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { validate, schemas } from '../middleware/validator';
import { UserRole } from '../types';
import Joi from 'joi';

const router = Router();

router.use(authenticate);
router.use(roleGuard([UserRole.SUPER_ADMIN]));

// Validation schemas
const branchSchema = Joi.object({
  name: Joi.string().required(),
  code: Joi.string().required(),
  logoUrl: Joi.string().uri().allow(''),
  phone: Joi.string().allow(''),
  email: Joi.string().email().allow(''),
  address: Joi.string().allow('')
});

const academicYearSchema = Joi.object({
  yearName: Joi.string().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required()
});

const capacitySchema = Joi.object({
  capacity: Joi.number().integer().min(0).required()
});

//  New: Create user schema
const createUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  role: Joi.string().required(),
  branchId: Joi.string().uuid().optional(),
  phone: Joi.string().allow('').optional()
});

// User Management
router.post('/create-school-admin', validate(schemas.createAdminUser), superAdminController.createSchoolAdmin);
router.post('/create-vice-principal', validate(schemas.createAdminUser), superAdminController.createVicePrincipal);
router.post('/create-auditor', validate(schemas.createAdminUser), superAdminController.createAuditor);
router.post('/users', validate(createUserSchema), superAdminController.createUser); // ✅ New
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:id', superAdminController.getUserById);
router.patch('/users/:id/status', validate(schemas.updateUserStatus), superAdminController.updateUserStatus);
router.delete('/users/:id', superAdminController.deleteUser);

// Branch Management
router.post('/branches', validate(branchSchema), superAdminController.createBranch);
router.get('/branches', superAdminController.getBranches);
router.get('/branches/:id', superAdminController.getBranchById);
router.patch('/branches/:id', superAdminController.updateBranch);
router.delete('/branches/:id', superAdminController.deleteBranch);

// System Reports
router.get('/reports/system', superAdminController.getSystemReport);
router.get('/reports/branch/:id', superAdminController.getBranchReport);
router.get('/analytics', superAdminController.getAnalytics);

// Academic Year Management
router.post('/academic-years', validate(academicYearSchema), superAdminController.createGlobalAcademicYear);
router.get('/academic-years', superAdminController.getGlobalAcademicYears);
router.patch('/academic-years/:id/activate', superAdminController.activateGlobalAcademicYear);

// Class Capacity
router.patch('/classes/:id/capacity', validate(capacitySchema), superAdminController.setClassCapacity);

// Dashboard
router.get('/dashboard', superAdminController.getDashboard);

// Finance Settings Management
router.get('/finance-settings', superAdminController.getFinanceSettings);
router.patch('/finance-settings/:key', superAdminController.updateFinanceSetting);
router.get('/finance-settings/audit-log', superAdminController.getFinanceSettingsAuditLog);

// SMTP / Email Settings Management
router.get('/smtp-settings', superAdminController.getSmtpSettings);
router.put('/smtp-settings', superAdminController.updateSmtpSettings);
router.post('/smtp-settings/test', superAdminController.testSmtpSettings);

// System settings (branding, contact, global flags)
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

router.get('/system-settings', superAdminController.getSystemSettings);
router.put('/system-settings', validate(systemSettingsSchema), superAdminController.updateSystemSettings);

const branchGradeFeeSchema = Joi.object({
  branchId: Joi.string().uuid().required(),
  gradeLevel: Joi.string().required(),
  monthlyFee: Joi.number().min(0).required(),
  registrationFee: Joi.number().min(0).required(),
  busFee: Joi.number().min(0).required(),
});

router.get('/branch-grade-fees', superAdminController.getBranchGradeFees);
router.post('/branch-grade-fees', validate(branchGradeFeeSchema), superAdminController.upsertBranchGradeFee);
router.delete('/branch-grade-fees/:id', superAdminController.deleteBranchGradeFee);

const profitTargetSchema = Joi.object({
  branchId: Joi.string().uuid().required(),
  ethiopianMonth: Joi.number().integer().min(1).max(13).required(),
  targetAmount: Joi.number().required(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
});

router.get('/profit-targets/branch-summary', superAdminController.getBranchProfitSummary);
router.get('/profit-targets', superAdminController.getMonthlyProfitTargets);
router.post('/profit-targets', validate(profitTargetSchema), superAdminController.upsertMonthlyProfitTarget);

export default router;