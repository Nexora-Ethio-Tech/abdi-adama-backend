import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { AuthRequest } from '../types';
import schoolAdminService from '../services/schoolAdmin.service';
import {
  validateRegistrationForm,
  validateAndFormatPhoneNumber,
  validateFileSize,
} from '../utils/validation';
import { deleteUploadedFile } from '../middleware/upload';
import logger from '../utils/logger';

class SchoolAdminController {
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

  // Academic Year Management
  async createAcademicYear(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { yearName, startDate, endDate } = req.body;

      const academicYear = await schoolAdminService.createAcademicYear({
        yearName,
        startDate,
        endDate,
        branchId: branchId!
      });

      res.status(201).json({
        success: true,
        data: academicYear,
        message: 'Academic year created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async getAcademicYears(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const academicYears = await schoolAdminService.getAcademicYears(branchId!);

      res.json({
        success: true,
        data: academicYears
      });
    } catch (error) {
      next(error);
    }
  }

  async activateAcademicYear(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const branchId = req.user!.branch_id;

      const academicYear = await schoolAdminService.activateAcademicYear(id, branchId!);

      res.json({
        success: true,
        data: academicYear,
        message: 'Academic year activated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Student Application Management
  async createPendingApplication(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const userId = req.user!.id;

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
      const feeStatus = extractField('feeStatus');
      const bloodGroup = extractField('bloodGroup');
      const allergies = extractField('allergies');
      const chronicConditions = extractField('chronicConditions');
      const medications = extractField('medications');
      const notes = extractField('notes');

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
        feeStatus,
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

      // Ensure branchId exists
      if (!branchId) {
        logger.error('User missing branch_id:', { userId });
        res.status(400).json({
          success: false,
          message: 'User branch not found',
          errors: { branchId: 'Branch ID is required' },
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
        registrationFeeStatus: feeStatus || 'Pending',
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
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
          path: req.file.path,
        });

        // Validate file size
        const fileSizeValidation = validateFileSize(req.file.size);
        if (!fileSizeValidation.isValid) {
          deleteUploadedFile(req.file.path);
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

        // Store relative path in DB for portability
        try {
          const relativePath = path.relative(process.cwd(), req.file.path);
          applicationData.transcriptFilePath = relativePath;
          logger.debug('Calculated relative path:', relativePath);
        } catch (err: any) {
          logger.warn('Failed to calculate relative path, using absolute:', err.message);
          applicationData.transcriptFilePath = req.file.path;
        }
        applicationData.transcriptFileName = req.file.filename;
        applicationData.transcriptFileSize = req.file.size;
        applicationData.transcriptUploadedAt = new Date();

        logger.info('File metadata prepared for database:', {
          transcriptFilePath: applicationData.transcriptFilePath,
          transcriptFileName: applicationData.transcriptFileName,
          transcriptFileSize: applicationData.transcriptFileSize,
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

      // Clean up uploaded file if error occurs
      if (req.file) {
        logger.warn('Cleaning up uploaded file due to error:', req.file.path);
        deleteUploadedFile(req.file.path);
      }

      next(error);
    }
  }

  // Public endpoint for landing page submissions (no auth)
  async createPublicPendingApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Use same validation and file handling as authenticated route but determine branchId automatically
      const defaultBranchId = await schoolAdminService.getDefaultBranchId();
      if (!defaultBranchId) {
        logger.error('No default branch found for public application');
        res.status(500).json({ success: false, message: 'Server misconfiguration: no branch available' });
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
        feeStatus,
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
        feeStatus,
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
        registrationFeeStatus: feeStatus || 'Pending',
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
          deleteUploadedFile(file.path);
          res.status(400).json({ success: false, message: 'File upload failed', errors: { transcriptFile: fileSizeValidation.error } });
          return;
        }
        try {
          applicationData.transcriptFilePath = path.relative(process.cwd(), file.path);
        } catch (err) {
          applicationData.transcriptFilePath = file.path;
        }
        applicationData.transcriptFileName = file.filename;
        applicationData.transcriptFileSize = file.size;
        applicationData.transcriptUploadedAt = new Date();
      }

      const application = await schoolAdminService.createPendingApplication(applicationData);
      res.status(201).json({ success: true, data: application, message: 'Application submitted successfully' });
      return;
    } catch (error) {
      logger.error('Error in createPublicPendingApplication:', error instanceof Error ? error.message : error);
      if ((req as any).file) deleteUploadedFile((req as any).file.path);
      next(error);
    }
  }

  async getPendingApplications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const branchId = req.user!.branch_id;
      const { status } = req.query;

      const applications = await schoolAdminService.getPendingApplications(
        branchId!,
        status as string
      );

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      next(error);
    }
  }

  async updateApplicationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const reviewerId = req.user?.id;
      const application = await schoolAdminService.updateApplicationStatus(id, status, reviewerId);

      res.json({
        success: true,
        data: application,
        message: 'Application status updated successfully'
      });
    } catch (error) {
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
}

export default new SchoolAdminController();
