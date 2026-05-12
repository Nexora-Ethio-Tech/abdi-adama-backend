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

// User Management
router.post('/create-school-admin', validate(schemas.createAdminUser), superAdminController.createSchoolAdmin);
router.post('/create-vice-principal', validate(schemas.createAdminUser), superAdminController.createVicePrincipal);
router.post('/create-auditor', validate(schemas.createAdminUser), superAdminController.createAuditor);
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

// Academic Year Management
router.post('/academic-years', validate(academicYearSchema), superAdminController.createGlobalAcademicYear);
router.get('/academic-years', superAdminController.getGlobalAcademicYears);
router.patch('/academic-years/:id/activate', superAdminController.activateGlobalAcademicYear);

// Class Capacity
router.patch('/classes/:id/capacity', validate(capacitySchema), superAdminController.setClassCapacity);

// Dashboard
router.get('/dashboard', superAdminController.getDashboard);

export default router;
