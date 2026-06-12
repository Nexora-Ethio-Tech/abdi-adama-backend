import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { AuthRequest } from '../types';
import schoolAdminService from '../services/schoolAdmin.service';
import superAdminService from '../services/superAdmin.service';
import pool from '../config/database';
import {
  validateRegistrationForm,
  validateAndFormatPhoneNumber,
  validateFileSize,
} from '../utils/validation';
import logger from '../utils/logger';
import { broadcast } from '../shared/sseManager';

class SchoolAdminController {
  async toggleRegistration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { open } = req.body;
      const adminId = req.user!.id;
      if (typeof open !== 'boolean') {
        throw new Error('open must be a boolean');
      }

      const settings = await superAdminService.updateSystemSettings({ registration_open: open ? 'true' : 'false' }, adminId);

      res.json({
        success: true,
        data: settings,
        message: `Registration is now ${open ? 'open' : 'closed'}`
      });
    } catch (error) {
      next(error);
    }
  }

  // User Management (existing methods)
  async registerUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const userData = { ...req.body, branchId };

      const result = await schoolAdminService.registerUser(userData);

      res.status(201).json({
        success: true,
        data: result,
        message: 'User registered successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getBranchUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { role, status } = req.query;

      const users = await schoolAdminService.getBranchUsers(branchId!, role as string, status as string);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  async getStaffAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { date } = req.query;

      const attendance = await schoolAdminService.getStaffAttendance(branchId!, date as string);

      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const user = await schoolAdminService.getUserById(id, branchId!);

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  // User Status Management (Approve/Revoke)
  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const branchId = req.user!.branch_id;
      const schoolAdminId = req.user!.id;

      const user = await schoolAdminService.updateUserStatus(id, status, branchId!, schoolAdminId);

      res.json({
        success: true,
        data: user,
        message: `User ${status.toLowerCase()} successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete User
  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      const schoolAdminId = req.user!.id;

      await schoolAdminService.deleteUser(id, branchId!, schoolAdminId);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update User (Edit student/teacher/parent details)
  async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      const updateData = req.body;

      const user = await schoolAdminService.updateUser(id, branchId!, updateData);

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update Student record (grade, status, guardian info, etc.)
  async updateStudent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      const updateData = req.body;

      // Students live in the users + students tables; updateUser covers both
      const user = await schoolAdminService.updateUser(id, branchId!, updateData);

      res.json({
        success: true,
        data: user,
        message: 'Student updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Assign Student to Class
  async assignStudentToClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { studentId, classId } = req.body;

      const result = await schoolAdminService.assignStudentToClass(studentId, classId, branchId!);

      res.json({
        success: true,
        data: result,
        message: 'Student assigned to class successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove Student from Class
  async removeStudentFromClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { studentId } = req.params;
      const branchId = req.user!.branch_id;

      await schoolAdminService.removeStudentFromClass(studentId, branchId!);

      res.json({
        success: true,
        message: 'Student removed from class successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Reset user PIN
  async resetUserPIN(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const result = await schoolAdminService.resetUserPIN(id, branchId!);

      res.json({
        success: true,
        data: result,
        message: `PIN reset successfully. New PIN: ${result.newPIN}`
      });
    } catch (error) {
      next(error);
    }
  }

  // Class Management
  async createClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { name, capacity, section } = req.body;

      const classData = await schoolAdminService.createClass({
        name,
        capacity,
        section,
        branchId: branchId!
      });

      res.status(201).json({
        success: true,
        data: classData,
        message: 'Class created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getClasses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const classes = await schoolAdminService.getClasses(branchId!);

      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      next(error);
    }
  }

  async updateClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      const updateData = req.body;

      const classData = await schoolAdminService.updateClass(id, branchId!, updateData);

      res.json({
        success: true,
        data: classData,
        message: 'Class updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      await schoolAdminService.deleteClass(id, branchId!);

      res.json({
        success: true,
        message: 'Class deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Teacher Assignment
  async assignTeacherToClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { teacherId } = req.body;
      const branchId = req.user!.branch_id;

      const classData = await schoolAdminService.assignTeacherToClass(id, teacherId, branchId!);

      res.json({
        success: true,
        data: classData,
        message: 'Teacher assigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async unassignTeacherFromClass(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, teacherId } = req.params; // id is class id
      const branchId = req.user!.branch_id;

      const result = await schoolAdminService.unassignTeacherFromClass(id, teacherId, branchId!);

      res.json({
        success: true,
        data: result,
        message: 'Teacher unassigned successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Course Management
  async createCourse(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, code, teacherId, classId } = req.body;

      const course = await schoolAdminService.createCourse({
        name,
        code,
        teacherId,
        classId
      });

      res.status(201).json({
        success: true,
        data: course,
        message: 'Course created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getCourses(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { classId } = req.query;

      const courses = await schoolAdminService.getCourses(branchId!, classId as string);

      res.json({
        success: true,
        data: courses
      });
    } catch (error) {
      next(error);
    }
  }

  // Schedule Management
  async createSchedule(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const scheduleData = req.body;

      const schedule = await schoolAdminService.createSchedule(scheduleData);

      res.status(201).json({
        success: true,
        data: schedule,
        message: 'Schedule created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getSchedules(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { teacherId, day } = req.query;

      const schedules = await schoolAdminService.getSchedules(
        branchId!,
        teacherId as string,
        day as string
      );

      res.json({
        success: true,
        data: schedules
      });
    } catch (error) {
      next(error);
    }
  }

  // Student Application Management
  // Student Application Management
  async createPendingApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrationOpen = await superAdminService.isRegistrationOpen();
      if (!registrationOpen) {
        res.status(403).json({
          success: false,
          error: {
            code: 'REGISTRATION_CLOSED',
            message: 'Online registration is currently closed.',
          },
        });
        return;
      }

      // Extract form data - handle both string and FormData inputs
      const extractField = (field: string): string => {
        const value = req.body[field];
        // Handle various input types (string, null, undefined)
        if (value === null || value === undefined || value === '') {
          return '';
        }
        return String(value).trim();
      };

      const name = extractField('name');
      const digital_id = extractField('digital_id');
      const dob = extractField('dob');
      const gender = extractField('gender');
      const email = extractField('email');
      const parentName = extractField('parentName');
      const parentPhone = extractField('parentPhone');
      const address = extractField('address');
      const previousSchool = extractField('previousSchool');
      const grade = extractField('grade');
      const bloodGroup = extractField('bloodGroup');
      const allergies = extractField('allergies');
      const chronicConditions = extractField('chronicConditions');
      const medications = extractField('medications');
      const notes = extractField('notes');
      const branchName = extractField('branchName');
      let branchId = req.user!.branch_id;
      const userId = req.user!.id;

      if (branchName) {
        const resolvedBranchId = await schoolAdminService.getBranchIdByName(branchName);
        if (!resolvedBranchId) {
          res.status(400).json({
            success: false,
            message: 'Invalid branch name',
            errors: { branchName: 'Branch Name is required and must match an existing branch.' },
          });
          return;
        }
        branchId = resolvedBranchId;
      }

      logger.debug('Received application data:', {
        name,
        parentName,
        parentPhone,
        grade,
        hasFile: !!req.file,
        fileName: req.file?.filename,
      });

      // Prepare form data for validation
      const formData = {
        name,
        digital_id,
        dob,
        gender,
        email,
        parentName,
        parentPhone,
        address,
        previousSchool,
        grade,
        bloodGroup,
        allergies,
        chronicConditions,
        medications,
      };

      // Validate all required fields
      const validation = validateRegistrationForm(formData);
      if (!validation.isValid) {
        logger.warn('Validation failed:', { errors: validation.errors, formData });
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        });
        return;
      }

      // Validate and format phone number
      const phoneValidation = validateAndFormatPhoneNumber(parentPhone);
      if (!phoneValidation.isValid) {
        logger.warn('Phone validation failed:', phoneValidation);
        res.status(400).json({
          success: false,
          message: 'Invalid phone number',
          errors: {
            parentPhone: phoneValidation.error,
          },
        });
        return;
      }

      // Check for duplicate application
      const hasExisting = await schoolAdminService.checkExistingApplication(
        digital_id || null,
        phoneValidation.formatted,
        name
      );
      if (hasExisting) {
        res.status(400).json({
          success: false,
          message: 'An active application with this FAN number or parent phone number already exists.',
          errors: {
            digital_id: 'An active application already exists.',
            parentPhone: 'An active application already exists.'
          }
        });
        return;
      }

      // Ensure branchId exists
      if (!branchId) {
        logger.error('User missing branch_id and branchName was not provided:', { userId });
        res.status(400).json({
          success: false,
          message: 'User branch not found',
          errors: { branchName: 'Branch Name is required' },
        });
        return;
      }

      // Prepare application data with formatted phone
      let applicationData: any = {
        branchId,
        applicantName: name,
        applicantEmail: email || null,
        applicantPhone: phoneValidation.formatted,
        digitalId: digital_id || null,
        dob: dob || null,
        gender: gender || null,
        parentName,
        parentPhone: phoneValidation.formatted,
        address: address || null,
        previousSchool: previousSchool || null,
        gradeApplying: grade,
        lastGradeCompleted: grade || null,
        bloodGroup: bloodGroup || null,
        allergies: allergies || null,
        chronicConditions: chronicConditions || null,
        currentMedications: medications || null,
        notes: notes || null,
        createdBy: userId,
      };

      // Handle file upload if provided
      if (req.file) {
        logger.info('Processing file upload:', {
          originalname: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        });

        // Validate file size
        const fileSizeValidation = validateFileSize(req.file.size);
        if (!fileSizeValidation.isValid) {
          logger.warn('File size validation failed:', fileSizeValidation.error);
          res.status(400).json({
            success: false,
            message: 'File upload failed',
            errors: {
              transcriptFile: fileSizeValidation.error,
            },
          });
          return;
        }

        // Store memory buffer and mime type for database blob storage
        applicationData.transcriptData = req.file.buffer;
        applicationData.transcriptMimeType = req.file.mimetype;
        applicationData.transcriptFileName = req.file.originalname;
        applicationData.transcriptFileSize = req.file.size;
        applicationData.transcriptUploadedAt = new Date();

        logger.info('File metadata prepared for database:', {
          transcriptFileName: applicationData.transcriptFileName,
          transcriptFileSize: applicationData.transcriptFileSize,
          transcriptMimeType: applicationData.transcriptMimeType
        });
      } else {
        logger.debug('No file in request - submission without transcript');
      }

      // Create the application
      logger.info('Creating pending application:', {
        applicantName: applicationData.applicantName,
        grade: applicationData.gradeApplying,
        branchId: applicationData.branchId,
        hasFile: !!req.file,
      });

      const application = await schoolAdminService.createPendingApplication(applicationData);

      logger.info(`✅ Application created successfully:`, {
        id: application.id,
        applicantName: application.applicant_name,
        status: application.status,
        transcriptFile: application.transcript_file_name || 'No file',
      });

      res.status(201).json({
        success: true,
        data: application,
        message: 'Application submitted successfully',
      });
    } catch (error) {
      logger.error('Error creating pending application:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : null,
      });

      next(error);
    }
  }

  async getBranches(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const branches = await schoolAdminService.getBranches();
      res.json({
        success: true,
        data: branches
      });
    } catch (error) {
      next(error);
    }
  }

  async getPendingApplications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { status } = req.query as { status?: string };
      const applications = await schoolAdminService.getPendingApplications(branchId!, status);
      res.json({ success: true, data: applications });
    } catch (error) {
      next(error);
    }
  }

  // Public endpoint for landing page submissions (no auth)

  async createPublicPendingApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registrationOpen = await superAdminService.isRegistrationOpen();
      if (!registrationOpen) {
        res.status(403).json({
          success: false,
          error: {
            code: 'REGISTRATION_CLOSED',
            message: 'Online registration is currently closed.',
          },
        });
        return;
      }

      const branchName = String(req.body?.branchName || '').trim();
      if (!branchName) {
        res.status(400).json({
          success: false,
          message: 'Branch Name is required',
          errors: { branchName: 'Branch Name is required' },
        });
        return;
      }

      const defaultBranchId = await schoolAdminService.getBranchIdByName(branchName);
      if (!defaultBranchId) {
        logger.warn('Unknown branch name submitted for public application:', { branchName });
        res.status(400).json({
          success: false,
          message: 'Invalid branch name',
          errors: { branchName: 'Branch Name must match an existing branch.' },
        });
        return;
      }

      // Compose a fake AuthRequest-like object for reuse of validation utilities
      const fakeReq: any = { body: req.body, file: (req as any).file, user: { id: null, branch_id: defaultBranchId } };

      // Delegate to same logic by calling internal helper pattern (copying key parts to avoid duplication)
      const {
        name,
        digital_id,
        dob,
        gender,
        email,
        parentName,
        parentPhone,
        address,
        previousSchool,
        grade,
        bloodGroup,
        allergies,
        chronicConditions,
        medications,
        notes
      } = fakeReq.body;

      const formData = {
        name,
        digital_id,
        dob,
        gender,
        email,
        parentName,
        parentPhone,
        address,
        previousSchool,
        grade,
        bloodGroup,
        allergies,
        chronicConditions,
        medications
      };

      const validation = validateRegistrationForm(formData);
      if (!validation.isValid) {
        logger.warn('Public submission validation failed:', validation.errors);
        res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
        return;
      }

      const phoneValidation = validateAndFormatPhoneNumber(parentPhone);
      if (!phoneValidation.isValid) {
        res.status(400).json({ success: false, message: 'Invalid phone number', errors: { parentPhone: phoneValidation.error } });
        return;
      }

      // Check for duplicate application
      const hasExisting = await schoolAdminService.checkExistingApplication(
        digital_id || null,
        phoneValidation.formatted,
        name
      );
      if (hasExisting) {
        res.status(400).json({
          success: false,
          message: 'An active application with this FAN number or parent phone number already exists.',
          errors: {
            digital_id: 'An active application already exists.',
            parentPhone: 'An active application already exists.'
          }
        });
        return;
      }

      const applicationData: any = {
        branchId: defaultBranchId,
        applicantName: name,
        applicantEmail: email || null,
        applicantPhone: phoneValidation.formatted,
        digitalId: digital_id || null,
        dob: dob || null,
        gender: gender || null,
        parentName,
        parentPhone: phoneValidation.formatted,
        address: address || null,
        previousSchool: previousSchool || null,
        gradeApplying: grade,
        lastGradeCompleted: grade || null,
        bloodGroup: bloodGroup || null,
        allergies: allergies || null,
        chronicConditions: chronicConditions || null,
        currentMedications: medications || null,
        notes: notes || null,
        createdBy: null // public submissions have no creator
      };

      if ((req as any).file) {
        const file = (req as any).file;
        const fileSizeValidation = validateFileSize(file.size);
        if (!fileSizeValidation.isValid) {
          res.status(400).json({ success: false, message: 'File upload failed', errors: { transcriptFile: fileSizeValidation.error } });
          return;
        }
        // Store memory buffer and mime type for database blob storage
        applicationData.transcriptData = file.buffer;
        applicationData.transcriptMimeType = file.mimetype;
        applicationData.transcriptFileName = file.originalname;
        applicationData.transcriptFileSize = file.size;
        applicationData.transcriptUploadedAt = new Date();
      }

      const application = await schoolAdminService.createPendingApplication(applicationData);
      res.status(201).json({ success: true, data: application, message: 'Application submitted successfully' });
      return;
    } catch (error) {
      logger.error('Error in createPublicPendingApplication:', error instanceof Error ? error.message : error);
      next(error);
    }
  }

  async updateApplicationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status, gradeApplying, grade_applying } = req.body;
      const selectedGrade = gradeApplying || grade_applying;

      const reviewerId = req.user?.id;
      const application = await schoolAdminService.updateApplicationStatus(id, status, reviewerId, selectedGrade);

      res.json({
        success: true,
        data: application,
        message: 'Application status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Download/View Application Transcript
  async getApplicationTranscript(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { id } = req.params;

      const transcript = await schoolAdminService.getApplicationTranscript(id, branchId!);
      if (!transcript || !transcript.transcript_data) {
        res.status(404).json({ success: false, message: 'Transcript not found' });
        return;
      }

      res.setHeader('Content-Type', transcript.transcript_mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${transcript.transcript_file_name}"`);
      res.send(transcript.transcript_data);
    } catch (error) {
      logger.error('Error fetching application transcript:', error instanceof Error ? error.message : error);
      next(error);
    }
  }

  // Financial Policy Management
  async setFinancialPolicy(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const policyData = req.body;

      const policy = await schoolAdminService.setFinancialPolicy({
        ...policyData,
        branchId: branchId!
      });

      res.status(201).json({
        success: true,
        data: policy,
        message: 'Financial policy set successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinancialPolicies(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const policies = await schoolAdminService.getFinancialPolicies(branchId!);

      res.json({
        success: true,
        data: policies
      });
    } catch (error) {
      next(error);
    }
  }

  // Dashboard
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const dashboard = await schoolAdminService.getDashboard(branchId!);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      next(error);
    }
  }

  // Get branch teachers
  async getBranchTeachers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const teachers = await schoolAdminService.getBranchTeachers(branchId!);

      res.json({
        success: true,
        data: teachers
      });
    } catch (error) {
      next(error);
    }
  }

  // Get branch students
  async getBranchStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { grade, status } = req.query;

      const students = await schoolAdminService.getBranchStudents(
        branchId!,
        grade as string,
        status as string
      );

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      next(error);
    }
  }

  // Get student by ID
  async getStudentById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const student = await schoolAdminService.getStudentById(id, branchId!);

      res.json({
        success: true,
        data: student
      });
    } catch (error) {
      next(error);
    }
  }

  // Get student admission record (application + documents)
  async getStudentAdmissionRecord(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const record = await schoolAdminService.getStudentAdmissionRecord(id, branchId!);

      res.json({
        success: true,
        data: record
      });
    } catch (error: any) {
      if (error.message === 'Student not found in your branch') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  }

  // ============================================================
  // DASHBOARD FEATURES
  // ============================================================

  // Get At-Risk Students
  async getAtRiskStudents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const result = await schoolAdminService.getAtRiskStudents(branchId!);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Upcoming Events
  async getUpcomingEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const events = await schoolAdminService.getUpcomingEvents(branchId!, limit);

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      next(error);
    }
  }

  // Get All Events (for calendar view)
  async getEvents(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const events = await schoolAdminService.getEvents(branchId!);
      res.json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  }

  // Create Event
  async createEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { title, date, type, description } = req.body;

      const event = await schoolAdminService.createEvent({
        title,
        date,
        type,
        description,
        branchId: branchId!
      });

      res.status(201).json({
        success: true,
        data: event,
        message: 'Event created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update Event
  async updateEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      const updateData = req.body;

      const event = await schoolAdminService.updateEvent(id, branchId!, updateData);

      res.json({
        success: true,
        data: event,
        message: 'Event updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete Event
  async deleteEvent(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const event = await schoolAdminService.deleteEvent(id, branchId!);

      res.json({
        success: true,
        message: `Event "${event.title}" deleted successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  // Finalize student registration after finance approval
  async finalizeRegistration(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { applicationId } = req.params;
      const { classId, sectionId } = req.body;
      const branchId = req.user!.branch_id;
      const schoolAdminId = req.user!.id;

      if (!classId || !sectionId) {
        res.status(400).json({
          success: false,
          message: 'Class and section are required',
          errors: {
            classId: classId ? undefined : 'Class is required',
            sectionId: sectionId ? undefined : 'Section is required'
          }
        });
        return;
      }

      const result = await schoolAdminService.finalizeRegistration(
        applicationId,
        classId,
        sectionId,
        schoolAdminId
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Student registration finalized successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Subject Management
  async getSubjects(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const subjects = await schoolAdminService.getSubjects(branchId!);
      res.json({
        success: true,
        data: subjects
      });
    } catch (error) {
      next(error);
    }
  }

  // Returns distinct course names grouped with grade level (for HoD promotion modal)
  async getCoursesWithGrade(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const courses = await schoolAdminService.getCoursesWithGrade(branchId!);
      res.json({ success: true, data: courses });
    } catch (error) {
      next(error);
    }
  }

  async createSubject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const subjectData = { ...req.body, branchId };
      const subject = await schoolAdminService.createSubject(subjectData);
      res.status(201).json({
        success: true,
        data: subject,
        message: 'Subject created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSubject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      const subject = await schoolAdminService.updateSubject(id, branchId!, req.body);
      res.json({
        success: true,
        data: subject,
        message: 'Subject updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSubject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      await schoolAdminService.deleteSubject(id, branchId!);
      res.json({
        success: true,
        message: 'Subject deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Teacher Promotion Management
  async promoteTeacher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;
      const promotionData = req.body;

      const result = await schoolAdminService.promoteTeacher(id, branchId!, promotionData);

      res.json({
        success: true,
        data: result,
        message: 'Teacher promoted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async removePromotion(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const result = await schoolAdminService.promoteTeacher(id, branchId!, { removePromotion: true });

      res.json({
        success: true,
        data: result,
        message: 'Promotion removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getGradingConfigs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await pool.query(
        `SELECT grade_level, method_id, label, max_weight FROM grading_configs
         ORDER BY grade_level,
           CASE method_id
             WHEN 'quiz-1'         THEN 1
             WHEN 'quiz-2'         THEN 2
             WHEN 'test-1'         THEN 3
             WHEN 'mid-exam'       THEN 4
             WHEN 'mid-assignment' THEN 4
             WHEN 'assignment'     THEN 5
             WHEN 'final-exam'     THEN 10
             ELSE 6
           END ASC, created_at ASC`
      );

      const configsMap: Record<string, Array<{ id: string; label: string; maxWeight: number }>> = {};
      for (const row of result.rows) {
        const grade = row.grade_level;
        if (!configsMap[grade]) {
          configsMap[grade] = [];
        }
        configsMap[grade].push({
          id: row.method_id,
          label: row.label,
          maxWeight: row.max_weight
        });
      }

      res.json({
        success: true,
        data: configsMap
      });
    } catch (error) {
      next(error);
    }
  }

  async publishGradingConfigs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const client = await pool.connect();
    try {
      const { gradeLevel, configs } = req.body;
      if (!gradeLevel || !Array.isArray(configs)) {
        res.status(400).json({ success: false, message: 'Invalid payload' });
        return;
      }

      await client.query('BEGIN');

      await client.query(
        'DELETE FROM grading_configs WHERE grade_level = $1',
        [gradeLevel]
      );

      for (const config of configs) {
        await client.query(
          `INSERT INTO grading_configs (grade_level, method_id, label, max_weight)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (grade_level, method_id)
           DO UPDATE SET label = $3, max_weight = $4`,
          [gradeLevel, config.id, config.label, config.maxWeight]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Grading configurations for Grade ${gradeLevel} published successfully.`
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }

  /**
   * POST /api/school-admin/notices
   * Creates a new school notice and broadcasts it via SSE to targeted roles.
   * Body: { title, content, priority, category, expiresAt?, audience }
   *   audience: 'all' | 'teacher' | 'driver' | 'clinic-admin' | 'parent,student'  (comma-separated)
   */
  async postNotice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const postedBy = req.user!.id;
      const { title, content, priority = 'Normal', category = 'Academic', expiresAt, audience = 'all' } = req.body;

      if (!title || !content) {
        res.status(400).json({ success: false, message: 'Title and content are required.' });
        return;
      }

      // audience can be 'all' or a comma-separated role list e.g. 'teacher,driver'
      const audienceStr = Array.isArray(audience) ? audience.join(',') : String(audience || 'all');

      const result = await pool.query(
        `INSERT INTO notices (title, content, priority, category, posted_by, branch_id, audience, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING *`,
        [title, content, priority, category, postedBy, branchId, audienceStr]
      );

      const notice = result.rows[0];

      // Resolve audience to SSE role list for broadcast
      // SSE roles use the exact JWT role strings (e.g. 'teacher', 'school-admin', 'driver', etc.)
      let sseRoles: string[];
      if (audienceStr === 'all') {
        sseRoles = ['teacher', 'driver', 'clinic-admin', 'parent', 'student', 'school-admin', 'vice-principal', 'super-admin', 'finance-clerk', 'librarian', 'auditor'];
      } else {
        // Map UI audience values to JWT roles
        const roleMap: Record<string, string[]> = {
          teacher: ['teacher'],
          driver: ['driver'],
          'clinic-admin': ['clinic-admin'],
          parent: ['parent', 'student'],
          student: ['student', 'parent'],
          'parent-student': ['parent', 'student'],
        };
        const inputRoles = audienceStr.split(',').map((r: string) => r.trim());
        sseRoles = inputRoles.flatMap((r: string) => roleMap[r] || [r]);
      }

      const broadcastPayload = {
        id: notice.id,
        title: notice.title,
        content: notice.content,
        priority: notice.priority,
        category: category,
        audience: audienceStr,
        createdAt: notice.created_at,
      };

      // Broadcast SCHOOL_NOTICE to relevant connected clients
      broadcast('SCHOOL_NOTICE', broadcastPayload, branchId || undefined, sseRoles);

      res.status(201).json({
        success: true,
        data: notice,
        message: 'Notice posted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/school-admin/notices
   * Returns recent school notices for the admin's branch (last 60 days).
   */
  async getNotices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const userRole = req.user!.role;
      const isAdminOrVP = ['super-admin', 'school-admin', 'vice-principal'].includes(userRole);

      let query = `SELECT
           n.id::text,
           n.title,
           n.content,
           n.priority,
           n.category,
           n.audience,
           n.created_at,
           u.name AS posted_by_name
         FROM notices n
         LEFT JOIN users u ON n.posted_by = u.id
         WHERE n.created_at > NOW() - INTERVAL '60 days'
           AND (n.branch_id = $1 OR n.branch_id IS NULL)`;

      const params: any[] = [branchId];

      if (!isAdminOrVP) {
        query += ` AND (n.audience = 'all' OR n.audience LIKE '%' || $2 || '%')`;
        params.push(userRole);
      }

      query += ` ORDER BY n.created_at DESC LIMIT 50`;

      const result = await pool.query(query, params);

      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/school-admin/notices/:id
   * Deletes a school notice and broadcasts NOTICE_DELETED via SSE.
   */
  async deleteNotice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const result = await pool.query(
        `DELETE FROM notices WHERE id = $1 AND (branch_id = $2 OR branch_id IS NULL) RETURNING id`,
        [id, branchId]
      );

      if ((result.rowCount ?? 0) === 0) {
        res.status(404).json({ success: false, message: 'Notice not found.' });
        return;
      }

      broadcast('SCHOOL_NOTICE_DELETED', { id }, branchId || undefined);

      res.json({ success: true, message: 'Notice deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // Get attendance summary by grade
  async getAttendanceSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { date, grade } = req.query;

      const result = await schoolAdminService.getAttendanceSummary(
        branchId!,
        date as string | undefined,
        grade as string | undefined
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get student attendance history (for 30-day average)
  async getStudentAttendanceHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { studentId, days } = req.query;

      if (!studentId || typeof studentId !== 'string') {
        res.status(400).json({ success: false, message: 'Student ID is required' });
        return;
      }

      const result = await schoolAdminService.getStudentAttendanceHistory(
        studentId,
        branchId!,
        days ? parseInt(days as string) : 30
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Manually record staff attendance (power-outage / machine-down fallback)
  async recordStaffAttendance(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const {
        userId,
        date,
        status,
        sign_in_time,
        lunch_out_time,
        lunch_in_time,
        sign_out_time,
      } = req.body;

      if (!userId || !date) {
        res.status(400).json({ success: false, message: 'userId and date are required.' });
        return;
      }

      const record = await schoolAdminService.recordStaffAttendance({
        adminId,
        userId,
        date,
        status,
        sign_in_time,
        lunch_out_time,
        lunch_in_time,
        sign_out_time,
      });

      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }
}

export default new SchoolAdminController();
