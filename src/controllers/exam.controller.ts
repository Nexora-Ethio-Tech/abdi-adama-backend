import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import examService from '../services/exam.service';
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
        return sendError(res, 'questionId and answer are required.', 400);
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
      if (!userId) return sendError(res, 'User identity not found. Please log in again.', 401);

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
}

export default new ExamController();
