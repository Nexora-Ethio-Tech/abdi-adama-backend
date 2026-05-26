import { Response } from 'express';
import { AuthRequest } from '../types';
import scheduleService from '../services/schedule.service';

class ScheduleController {

  // ── Config ───────────────────────────────────────────────────────────────────

  async saveConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const { periodsPerDay, startTime, endTime, maxConsecutivePeriods, distributeSubjects, academicYear } = req.body;

      const config = await scheduleService.saveConfig(branchId, {
        periodsPerDay, startTime, endTime,
        maxConsecutivePeriods, distributeSubjects, academicYear
      });

      res.json({ success: true, data: config });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'CONFIG_ERROR', message: error.message } });
    }
  }

  async getConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const academicYear = req.query.academicYear as string | undefined;
      const config = await scheduleService.getConfig(branchId, academicYear);

      res.json({ success: true, data: config });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'CONFIG_ERROR', message: error.message } });
    }
  }

  // ── Teacher Constraints ──────────────────────────────────────────────────────

  async saveTeacherConstraints(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const { teacherId } = req.params;
      const { constraints, academicYear } = req.body;

      const result = await scheduleService.saveTeacherConstraints(
        teacherId, branchId, constraints, academicYear
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'CONSTRAINT_ERROR', message: error.message } });
    }
  }

  async getTeacherConstraints(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const academicYear = req.query.academicYear as string | undefined;
      const constraints = await scheduleService.getTeacherConstraints(branchId, academicYear);

      res.json({ success: true, data: constraints });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'CONSTRAINT_ERROR', message: error.message } });
    }
  }

  // ── Course Frequencies ───────────────────────────────────────────────────────

  async saveCourseFrequencies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const { frequencies, academicYear } = req.body;

      const result = await scheduleService.saveCourseFrequencies(branchId, frequencies, academicYear);

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'FREQUENCY_ERROR', message: error.message } });
    }
  }

  async getCourseFrequencies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const academicYear = req.query.academicYear as string | undefined;
      const frequencies = await scheduleService.getCourseFrequencies(branchId, academicYear);

      res.json({ success: true, data: frequencies });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'FREQUENCY_ERROR', message: error.message } });
    }
  }

  // ── Timetable Structure ─────────────────────────────────────────────────────

  async saveStructure(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const { structures, academicYear } = req.body;

      const result = await scheduleService.saveStructure(branchId, structures, academicYear);

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'STRUCTURE_ERROR', message: error.message } });
    }
  }

  async getStructure(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const academicYear = req.query.academicYear as string | undefined;
      const structure = await scheduleService.getStructure(branchId, academicYear);

      res.json({ success: true, data: structure });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'STRUCTURE_ERROR', message: error.message } });
    }
  }

  // ── Timetable Generation ─────────────────────────────────────────────────────

  async generateTimetable(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const userId = req.user!.id;
      const { academicYear } = req.body;

      const result = await scheduleService.generateTimetable(branchId, userId, academicYear);

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'GENERATION_ERROR', message: error.message } });
    }
  }

  async approveCandidate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const { runId } = req.params;
      const { candidateIndex } = req.body;

      const result = await scheduleService.approveCandidate(runId, candidateIndex, branchId);

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'APPROVAL_ERROR', message: error.message } });
    }
  }

  // ── Query ────────────────────────────────────────────────────────────────────

  async getTimetableRuns(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const academicYear = req.query.academicYear as string | undefined;
      const runs = await scheduleService.getTimetableRuns(branchId, academicYear);

      res.json({ success: true, data: runs });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'QUERY_ERROR', message: error.message } });
    }
  }

  async getTimetableRunDetail(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const { runId } = req.params;
      const detail = await scheduleService.getTimetableRunDetail(runId, branchId);

      if (!detail) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Run not found' } });
        return;
      }

      res.json({ success: true, data: detail });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'QUERY_ERROR', message: error.message } });
    }
  }

  async getGeneratedSchedule(req: AuthRequest, res: Response): Promise<void> {
    try {
      const branchId = req.user!.branch_id!;
      const schedule = await scheduleService.getGeneratedSchedule(branchId);

      res.json({ success: true, data: schedule, count: schedule.length });
    } catch (error: any) {
      res.status(400).json({ success: false, error: { code: 'QUERY_ERROR', message: error.message } });
    }
  }
}

export default new ScheduleController();
