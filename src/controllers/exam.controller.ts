import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import examService from '../services/exam.service';
import teacherExamService from '../services/teacherExam.service';
import { sendSuccess, sendError } from '../shared/responseUtils';

class ExamController {

  // ─── Student: list published exams ─────────────────────────────────────────
  async listAvailableExams(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId) { sendError(res, 'Unauthorized', 401); return; }
      const exams = await teacherExamService.getPublishedExamsForStudent(userId);
      sendSuccess(res, exams);
    } catch (error: any) { next(error); }
  }

  // ─── Student: get exam details with shuffled variation ─────────────────────
  async getExamDetails(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId) { sendError(res, 'Unauthorized', 401); return; }
      const examDetail = await teacherExamService.getExamDetailsForStudent(examId, userId);
      sendSuccess(res, examDetail);
    } catch (error: any) { next(error); }
  }

  // ─── Student: save answer ──────────────────────────────────────────────────
  async saveExamAnswer(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { questionId, answer, sessionId } = req.body;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId || !questionId || answer === undefined) {
        sendError(res, 'Missing required fields', 400); return;
      }
      if (sessionId) {
        const saved = await teacherExamService.saveExamAnswer(examId, userId, sessionId, questionId, answer);
        sendSuccess(res, saved, 'Answer saved');
      } else {
        await examService.saveExamAnswer(examId, userId, questionId, answer);
        sendSuccess(res, { examId, questionId, answer });
      }
    } catch (error: any) { next(error); }
  }

  // ─── Student: report violation (browser switch etc) ────────────────────────
  async reportViolation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId) { sendError(res, 'Missing required fields', 400); return; }
      const count = await teacherExamService.incrementViolationCount(examId, userId);
      sendSuccess(res, { violationCount: count }, `Violation recorded (${count}/3)`);
    } catch (error: any) { next(error); }
  }

  // ─── Student: terminate exam (3rd strike or manual stop) ───────────────────
  async terminateExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { reason } = req.body;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId) { sendError(res, 'Missing required fields', 400); return; }
      await teacherExamService.markTerminated(examId, userId, reason || 'manual_stop');
      sendSuccess(res, { terminated: true }, 'Exam terminated and score saved');
    } catch (error: any) { next(error); }
  }

  // ─── Student: validate teacher-issued reset PIN ────────────────────────────
  async validateResetPin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { pin } = req.body;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId || !pin) { sendError(res, 'Missing required fields', 400); return; }
      const valid = await teacherExamService.validateResetPin(examId, userId, pin);
      if (!valid) { sendError(res, 'Invalid or already-used PIN', 401); return; }
      sendSuccess(res, { unlocked: true }, 'PIN accepted – session restored');
    } catch (error: any) { next(error); }
  }

  // ─── Teacher: issue reset PIN for a student ────────────────────────────────
  async issueResetPin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: examId } = req.params;
      const { studentId, pin } = req.body;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId || !studentId || !pin) {
        sendError(res, 'Missing required fields: studentId, pin', 400); return;
      }
      if (pin.length < 4 || pin.length > 10) {
        sendError(res, 'PIN must be 4-10 characters', 400); return;
      }
      const result = await teacherExamService.issueResetPin(examId, studentId, userId, pin);
      sendSuccess(res, result, 'Reset PIN issued');
    } catch (error: any) { next(error); }
  }

  // ─── Student: submit exam ──────────────────────────────────────────────────
  async submitExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId) { sendError(res, 'Missing examId', 400); return; }
      const result = await teacherExamService.submitExamResult(examId, userId);
      sendSuccess(res, result, 'Exam submitted successfully');
    } catch (error: any) { next(error); }
  }

  // ─── Student: start session ────────────────────────────────────────────────
  async startExamSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId) { sendError(res, 'Missing examId', 400); return; }
      const session = await teacherExamService.createExamSession(examId, userId);
      sendSuccess(res, session, 'Exam session started');
    } catch (error: any) { next(error); }
  }

  // ─── Student: verify password ──────────────────────────────────────────────
  async verifyExamPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { password } = req.body;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId || !password) { sendError(res, 'Missing fields', 400); return; }
      const isValid = await teacherExamService.verifyExamPassword(examId, password);
      if (!isValid) { sendError(res, 'Incorrect password', 401); return; }
      const session = await teacherExamService.createExamSession(examId, userId);
      await teacherExamService.markPasswordVerified(examId, userId);
      sendSuccess(res, { session, message: 'Password verified' });
    } catch (error: any) { next(error); }
  }

  // ─── Teacher: CRUD ─────────────────────────────────────────────────────────
  async createExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId) { sendError(res, 'Unauthorized', 401); return; }
      const { title, courseId, courseName, category, durationMinutes, questions,
        classId, gradeId, subjectId, examType, totalMarks, duration,
        selectedSection, examPassword, passwordRequired, instructions } = req.body;
      if (gradeId || subjectId) {
        const exam = await teacherExamService.createExam({
          teacherId: userId, classId: classId || null, gradeId: gradeId || null,
          subjectId: subjectId || null, title, examType: examType || 'Regular Exam',
          totalMarks: totalMarks || 100, duration: duration || durationMinutes || 60,
          instructions: instructions || '', selectedSection: selectedSection || null,
          questions: questions || [], examPassword: examPassword || null,
          isLocked: !!examPassword, passwordRequired: passwordRequired || !!examPassword,
        });
        sendSuccess(res, exam, 'Exam created successfully', 201);
      } else {
        const exam = await examService.createExam(userId, { title, courseId: courseId || null, courseName, category, durationMinutes, questions });
        sendSuccess(res, exam, 'Exam created successfully', 201);
      }
    } catch (error: any) { next(error); }
  }

  async getTeacherExams(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId) { sendError(res, 'Unauthorized', 401); return; }
      const result = await teacherExamService.getTeacherExams(userId);
      sendSuccess(res, result);
    } catch (error: any) { next(error); }
  }

  async getTeacherExamById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId) { sendError(res, 'Unauthorized', 401); return; }
      const exam = await teacherExamService.getExamById(id);
      if (exam.teacher_id !== userId) { sendError(res, 'Unauthorized', 403); return; }
      sendSuccess(res, exam);
    } catch (error: any) {
      if (error.message === 'Exam not found') sendError(res, error.message, 404);
      else next(error);
    }
  }

  async updateTeacherExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId) { sendError(res, 'Unauthorized', 401); return; }
      const exam = await teacherExamService.getExamById(id);
      if (exam.teacher_id !== userId) { sendError(res, 'Unauthorized', 403); return; }
      const updated = await teacherExamService.updateExam(id, req.body);
      sendSuccess(res, updated, 'Exam updated successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('cannot be updated')) sendError(res, error.message, 400);
      else next(error);
    }
  }

  async publishTeacherExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId) { sendError(res, 'Unauthorized', 401); return; }
      const published = await teacherExamService.publishExam(id, userId);
      sendSuccess(res, published, 'Exam published successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Unauthorized')) sendError(res, error.message, 400);
      else next(error);
    }
  }

  async deleteTeacherExam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params; const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId) { sendError(res, 'Unauthorized', 401); return; }
      const result = await teacherExamService.deleteExam(id, userId);
      sendSuccess(res, result, 'Exam deleted successfully');
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('cannot be deleted')) sendError(res, error.message, 400);
      else next(error);
    }
  }

  async submitExamResult(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { examId } = req.params;
      const { score, totalMarks } = req.body;
      const userId = (req.user as any)?.id || (req.user as any)?.user_id || (req.user as any)?.userId;
      if (!userId || !examId) { sendError(res, 'Missing fields', 400); return; }
      const result = await teacherExamService.submitExamResult(examId, userId, score, totalMarks);
      sendSuccess(res, result, 'Exam submitted successfully');
    } catch (error: any) { next(error); }
  }
}

export default new ExamController();
