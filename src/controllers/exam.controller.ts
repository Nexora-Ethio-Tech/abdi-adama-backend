import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import examService from '../services/exam.service';
import teacherExamService from '../services/teacherExam.service';
import { sendSuccess, sendError } from '../shared/responseUtils';

class ExamController {
  async listAvailableExams(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { sendError(res, 'User identity not found. Please log in again.', 401); return; }

      const exams = await examService.listAvailableExams(userId);
      sendSuccess(res, exams);
    } catch (error: any) {
      next(error);
    }
  }

  async getExamDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = req.user?.id;
      if (!userId) { sendError(res, 'User identity not found. Please log in again.', 401); return; }

      const examDetail = await examService.getExamDetails(examId, userId);
      sendSuccess(res, examDetail);
    } catch (error: any) {
      next(error);
    }
  }



  async createExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 'User identity not found. Please log in again.', 401);
        return;
      }

      const { 
        title, 
        courseId, 
        courseName, 
        category, 
        durationMinutes, 
        questions,
        classId,
        gradeId,
        subjectId,
        examType,
        totalMarks,
        duration,
        selectedSection,
        examPassword,
        passwordRequired,
        instructions
      } = req.body;

      // If using new format (grade/subject selection), use teacherExamService
      if (gradeId || subjectId) {
        const exam = await teacherExamService.createExam({
          teacherId: userId,
          classId: classId || null,
          gradeId: gradeId || null,
          subjectId: subjectId || null,
          title: title,
          examType: examType || 'Regular Exam',
          totalMarks: totalMarks || 100,
          duration: duration || durationMinutes || 60,
          instructions: instructions || '',
          selectedSection: selectedSection || null,
          questions: questions || [],
          examPassword: examPassword || null,
          isLocked: !!examPassword,
          passwordRequired: passwordRequired || !!examPassword
        });

        sendSuccess(res, exam, 'Exam created successfully', 201);
      } else {
        // Fall back to original examService for backward compatibility
        const exam = await examService.createExam(userId, {
          title,
          courseId: courseId || null,
          courseName,
          category,
          durationMinutes,
          questions
        });

        sendSuccess(res, exam, 'Exam created successfully', 201);
      }
    } catch (error: any) {
      next(error);
    }
  }

  // ─── Student Exam Submission ────────────────────────────────────────────────

  async saveExamAnswer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { questionId, answer, sessionId } = req.body;
      const userId = req.user?.id;

      if (!userId || !examId || !questionId || answer === undefined) {
        sendError(res, 'Missing required fields', 400);
        return;
      }

      // If sessionId provided, use new teacher exam service; otherwise use old exam service
      if (sessionId) {
        const savedAnswer = await teacherExamService.saveExamAnswer(examId, userId, sessionId, questionId, answer);
        sendSuccess(res, savedAnswer, 'Answer saved');
      } else {
        await examService.saveExamAnswer(examId, userId, questionId, answer);
        sendSuccess(res, { examId, questionId, answer });
      }
    } catch (error: any) {
      next(error);
    }
  }

  async submitExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = req.user?.id;

      if (!userId || !examId) {
        sendError(res, 'Missing required fields: examId', 400);
        return;
      }

      // Submit exam using teacher exam service (auto-grade if score/total not provided)
      const result = await teacherExamService.submitExamResult(examId, userId);
      sendSuccess(res, result, 'Exam submitted successfully');
    } catch (error: any) {
      next(error);
    }
  }

  // ─── Teacher Exam Management ───────────────────────────────────────────────

  async getTeacherExams(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 'User identity not found. Please log in again.', 401);
        return;
      }

      const exams = await teacherExamService.getTeacherExams(userId);

      // Separate draft and published exams
      const draftExams = exams.filter(e => e.status === 'draft');
      const publishedExams = exams.filter(e => e.status === 'published');

      sendSuccess(res, { draftExams, publishedExams });
    } catch (error: any) {
      next(error);
    }
  }

  async getTeacherExamById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 'User identity not found. Please log in again.', 401);
        return;
      }

      const exam = await teacherExamService.getExamById(id);
      if (exam.teacher_id !== userId) {
        sendError(res, 'Unauthorized', 403);
        return;
      }

      sendSuccess(res, exam);
    } catch (error: any) {
      if (error.message === 'Exam not found') {
        sendError(res, error.message, 404);
      } else {
        next(error);
      }
    }
  }

  async updateTeacherExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 'User identity not found. Please log in again.', 401);
        return;
      }

      // Verify ownership
      const exam = await teacherExamService.getExamById(id);
      if (exam.teacher_id !== userId) {
        sendError(res, 'Unauthorized', 403);
        return;
      }

      const updateData = req.body;
      const updatedExam = await teacherExamService.updateExam(id, updateData);

      sendSuccess(res, updatedExam, 'Exam updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('cannot be updated')) {
        sendError(res, error.message, 400);
      } else {
        next(error);
      }
    }
  }

  async publishTeacherExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 'User identity not found. Please log in again.', 401);
        return;
      }

      const publishedExam = await teacherExamService.publishExam(id, userId);

      sendSuccess(res, publishedExam, 'Exam published successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Unauthorized')) {
        sendError(res, error.message, 400);
      } else {
        next(error);
      }
    }
  }

  async deleteTeacherExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 'User identity not found. Please log in again.', 401);
        return;
      }

      const result = await teacherExamService.deleteExam(id, userId);

      sendSuccess(res, result, 'Exam deleted successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('cannot be deleted')) {
        sendError(res, error.message, 400);
      } else {
        next(error);
      }
    }
  }

  // ─── Exam Password & Session Management ───────────────────────────────────────

  async verifyExamPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { password } = req.body;
      const userId = req.user?.id;

      if (!userId || !examId || !password) {
        sendError(res, 'Missing required fields: examId, password', 400);
        return;
      }

      const isValid = await teacherExamService.verifyExamPassword(examId, password);
      if (!isValid) {
        sendError(res, 'Incorrect password', 401);
        return;
      }

      // Create session and mark password as verified
      const session = await teacherExamService.createExamSession(examId, userId);
      await teacherExamService.markPasswordVerified(examId, userId);

      sendSuccess(res, { session, message: 'Password verified' });
    } catch (error: any) {
      next(error);
    }
  }

  async startExamSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = req.user?.id;

      if (!userId || !examId) {
        sendError(res, 'Missing required fields: examId', 400);
        return;
      }

      const session = await teacherExamService.createExamSession(examId, userId);
      sendSuccess(res, session, 'Exam session started');
    } catch (error: any) {
      next(error);
    }
  }

  async submitExamResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { score, totalMarks } = req.body;
      const userId = req.user?.id;

      if (!userId || !examId || score === undefined || !totalMarks) {
        sendError(res, 'Missing required fields: score, totalMarks', 400);
        return;
      }

      const result = await teacherExamService.submitExamResult(examId, userId, score, totalMarks);
      sendSuccess(res, result, 'Exam submitted successfully');
    } catch (error: any) {
      next(error);
    }
  }
}

export default new ExamController();
