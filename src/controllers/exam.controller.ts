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

  async saveExamAnswer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { questionId, answer } = req.body;
      const userId = req.user?.id;
      if (!userId) { sendError(res, 'User identity not found. Please log in again.', 401); return; }
      if (!questionId || typeof answer !== 'string') {
        sendError(res, 'questionId and answer are required.', 400);
        return;
      }

      await examService.saveExamAnswer(examId, userId, questionId, answer);
      sendSuccess(res, { examId, questionId, answer });
    } catch (error: any) {
      next(error);
    }
  }

  async submitExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { autoSubmitted } = req.body;
      const userId = req.user?.id;
      if (!userId) { sendError(res, 'User identity not found. Please log in again.', 401); return; }

      const result = await examService.submitExam(examId, userId, !!autoSubmitted);
      sendSuccess(res, result, 'Exam submitted successfully');
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

      const { title, courseId, courseName, category, durationMinutes, questions } = req.body;
      const exam = await examService.createExam(userId, {
        title,
        courseId: courseId || null,
        courseName,
        category,
        durationMinutes,
        questions
      });

      sendSuccess(res, exam, 'Exam created successfully', 201);
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
}

export default new ExamController();
