import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import auditorService from '../services/auditor.service';
import pool from '../config/database';
import { gregorianToEthiopic } from '../utils/ethiopicUtils';

class AuditorController {
  /**
   * Helper: Resolve the effective branchId for the auditor.
   * Auditor is global (branch_id = null), so the caller must supply ?branchId=
   * The same fallback keeps other roles working if they ever hit these endpoints.
   */
  private resolveBranchId = (req: AuthRequest): string | null => {
    const queryBranch = req.query.branchId as string | undefined;
    return queryBranch || req.user!.branch_id || null;
  };

  getBranches = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await pool.query(
        `SELECT id, name, code, phone, email, address
         FROM branches
         ORDER BY name ASC`
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  };

  getPayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);
      const { studentId, startDate, endDate } = req.query;

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      const payments = await auditorService.getPayments(branchId, {
        studentId: studentId as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  };

  getFeeReductionRequests = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);
      const { status } = req.query;

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      const requests = await auditorService.getFeeReductionRequests(branchId, status as string);
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  };

  updateFeeReductionStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const branchId = this.resolveBranchId(req);
      const auditorId = req.user!.id;

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      const student = await auditorService.updateFeeReductionStatus(id, branchId, status, auditorId);
      res.json({ success: true, data: student, message: `Fee reduction ${status.toLowerCase()} successfully` });
    } catch (error) {
      next(error);
    }
  };

  getFinancialReport = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);
      const { startDate, endDate } = req.query;

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      if (!startDate || !endDate) {
        res.status(400).json({ success: false, error: { code: 'MISSING_PARAMETERS', message: 'startDate and endDate are required' } });
        return;
      }

      const report = await auditorService.getFinancialReport(branchId, startDate as string, endDate as string);
      res.json({ success: true, data: report });
    } catch (error) {
      next(error);
    }
  };

  getAuditTrail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);
      const { userId, action, category, direction, startDate, endDate } = req.query;

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      const auditTrail = await auditorService.getAuditTrail(branchId, {
        userId: userId as string,
        action: action as string,
        category: category as string,
        direction: direction as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({ success: true, data: auditTrail });
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);

      if (!branchId) {
        // Return zero-state dashboard when no branch selected yet
        res.json({
          success: true,
          data: {
            totalPayments: { count: 0, total: 0 },
            monthlyPayments: { count: 0, total: 0 },
            pendingFeeReductions: 0,
            pendingLoans: 0,
            pendingApprovals: 0,
            recentTransactions: []
          }
        });
        return;
      }

      const dashboard = await auditorService.getDashboard(branchId);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      next(error);
    }
  };

  getCollections = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);
      const { status, feeType } = req.query;

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      // - Summer months (11, 12, 13): only registration fee
      // - Regular months: monthly + bus + penalty (if overdue)
      // - Registration fee also included in non-summer months when applicable
      let query = `
        WITH fee_settings AS (
          SELECT
            COALESCE(MAX(CASE WHEN key = 'student_late_penalty_rate' THEN CAST(value AS numeric) END), 0) AS penalty_rate
          FROM finance_settings
          WHERE key = 'student_late_penalty_rate'
        ),
        base_collections AS (
          SELECT
            (sc.student_id::text || '-' || sc.month) AS id,
            sc.student_id,
            sc.month,
            u.name AS student_name,
            u.digital_id,
            s.grade,
            s.branch_id,
            SPLIT_PART(sc.month, '-', 2)::integer AS billing_month_num,
            CAST(SPLIT_PART(sc.month, '-', 1) AS integer) AS billing_year,
            -- Monthly fee
            CASE WHEN SPLIT_PART(sc.month, '-', 2)::integer IN (11, 12, 13) THEN 0
              ELSE COALESCE(NULLIF(s.monthly_fee, 0), (
                SELECT monthly_fee FROM branch_grade_fees
                WHERE branch_id = s.branch_id
                  AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
                LIMIT 1
              ), 0)
            END AS monthly_fee_due,
            -- Bus fee
            CASE WHEN SPLIT_PART(sc.month, '-', 2)::integer IN (11, 12, 13) OR NOT s.is_bus_user THEN 0
              ELSE COALESCE(NULLIF(s.bus_fee, 0), (
                SELECT bus_fee FROM branch_grade_fees
                WHERE branch_id = s.branch_id
                  AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
                LIMIT 1
              ), 0)
            END AS bus_fee_due,
            -- Penalty fee (only when overdue, not summer)
            CASE WHEN sc.status = 'overdue' AND SPLIT_PART(sc.month, '-', 2)::integer NOT IN (11, 12, 13) THEN
              COALESCE(NULLIF(s.penalty_fee, 0), (SELECT penalty_rate FROM fee_settings), 0)
            ELSE 0 END AS penalty_fee_due,
            -- Registration fee (summer months OR if student enrolled and reg not yet paid)
            CASE WHEN SPLIT_PART(sc.month, '-', 2)::integer IN (11, 12, 13) THEN
              COALESCE(
                (SELECT registration_fee FROM branch_grade_fees
                 WHERE branch_id = s.branch_id
                   AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
                 LIMIT 1),
                (SELECT CAST(value AS numeric) FROM finance_settings
                 WHERE key IN ('student_registration_fee', 'registration_fee')
                 ORDER BY CASE key WHEN 'student_registration_fee' THEN 1 ELSE 2 END LIMIT 1),
                0
              )
            ELSE
              COALESCE((
                SELECT SUM(pi2.amount) FROM payment_items pi2
                JOIN payments p2 ON pi2.payment_id = p2.id
                WHERE p2.student_id = sc.student_id AND p2.month = sc.month AND pi2.fee_type = 'registration'
              ), 0)
            END AS registration_fee_due,
            sc.status AS raw_status,
            sc.due_date,
            sc.updated_at
          FROM student_collections sc
          JOIN students s ON sc.student_id = s.id
          JOIN users u ON s.user_id = u.id
          WHERE s.branch_id = $1
        ),
        enriched AS (
          SELECT
            id, student_id, month, student_name, digital_id, grade, branch_id,
            billing_month_num, billing_year,
            monthly_fee_due, bus_fee_due, penalty_fee_due, registration_fee_due,
            -- Total = all applicable fee types
            (monthly_fee_due + bus_fee_due + penalty_fee_due +
              CASE WHEN billing_month_num IN (11, 12, 13) THEN registration_fee_due ELSE 0 END
            ) AS total_amount,
            -- Amount paid from payment_items (all fee types)
            COALESCE((
              SELECT SUM(pi.amount)
              FROM payment_items pi
              JOIN payments p ON pi.payment_id = p.id
              WHERE p.student_id = student_id AND p.month = month
            ), 0) AS amount_paid,
            CASE
              WHEN raw_status = 'cleared' THEN 'Paid'
              WHEN raw_status = 'overdue' THEN 'Overdue'
              ELSE 'Pending'
            END AS status,
            due_date, updated_at
          FROM base_collections
        )
        SELECT
          id, student_id, month, student_name, digital_id, grade, billing_month_num,
          billing_year, monthly_fee_due, bus_fee_due, penalty_fee_due, registration_fee_due,
          total_amount, amount_paid,
          GREATEST(0, total_amount - amount_paid) AS balance,
          status, due_date, updated_at
        FROM enriched
        WHERE 1=1
      `;
      const params: any[] = [branchId];
      let paramIndex = 2;

      if (status) {
        if (feeType === 'registration' && status === 'Pending') {
          query += ` AND status IN ('Pending', 'Overdue')`;
        } else {
          query += ` AND status = $${paramIndex++}`;
          params.push(
            status === 'Paid' ? 'Paid' :
            status === 'Overdue' ? 'Overdue' :
            'Pending'
          );
        }
      }

      if (feeType === 'registration') {
        query += ` AND billing_month_num IN (11, 12, 13)`;
      } else if (feeType === 'monthly') {
        query += ` AND billing_month_num NOT IN (11, 12, 13)`;
      } else if (feeType === 'penalty') {
        query += ` AND penalty_fee_due > 0`;
      }

      query += ` ORDER BY updated_at DESC, billing_year DESC, billing_month_num DESC`;

      const result = await pool.query(query, params);

      const mappedRows = result.rows.map(row => {
        const monthNum = parseInt(row.billing_month_num);
        const year = parseInt(row.billing_year);
        const ETHIOPIAN_MONTHS = ['Meskerem','Tikemt','Hidar','Tahsas','Tir','Yekatit','Megabit','Miazia','Ginbot','Sene','Hamle','Nehase','Pagume'];
        const monthName = monthNum >= 1 && monthNum <= 13 ? ETHIOPIAN_MONTHS[monthNum - 1] : String(monthNum);
        return {
          ...row,
          billing_month: monthName,
          billing_year: year
        };
      });

      res.json({ success: true, data: mappedRows });
    } catch (error) {
      next(error);
    }
  };

  getPayrollSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      const result = await pool.query(
        `SELECT
           r.id,
           r.month,
           r.year,
           r.status,
           r.total_gross,
           r.total_deductions,
           r.total_net,
           r.total_tax,
           r.total_pension_employee,
           r.total_pension_employer,
           r.created_at,
           r.finalized_at,
           g.name AS generated_by_name,
           f.name AS finalized_by_name
         FROM payroll_runs r
         LEFT JOIN users g ON r.generated_by = g.id
         LEFT JOIN users f ON r.finalized_by = f.id
         WHERE r.branch_id = $1
         ORDER BY r.year DESC, r.created_at DESC`,
        [branchId]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  };

  getLoansSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      const result = await pool.query(
        `SELECT
           l.id,
           l.amount,
           l.remaining_balance,
           l.monthly_deduction,
           l.months_paid,
           l.status,
           l.audited_by AS approved_by,
           l.issued_at AS created_at,
           l.completed_at,
           u.name AS employee_name,
           u.digital_id AS employee_digital_id,
           u.role AS employee_role,
           au.name AS approved_by_name
         FROM loans l
         JOIN users u ON l.employee_id = u.id
         LEFT JOIN users au ON l.audited_by = au.id
         WHERE u.branch_id = $1
         ORDER BY l.issued_at DESC`,
        [branchId]
      );
      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  };

  getOtherTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);
      const { startDate, endDate, type } = req.query;

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      let query = `
        SELECT ft.*, ft.verified_by AS recorded_by_name
        FROM finance_transactions ft
        WHERE ft.branch_id = $1 AND ft.student_id IS NULL
      `;
      const params: any[] = [branchId];
      let idx = 2;

      if (startDate) { query += ` AND ft.date >= $${idx++}`; params.push(startDate); }
      if (endDate)   { query += ` AND ft.date <= $${idx++}`; params.push(endDate); }
      if (type)      { query += ` AND ft.type = $${idx++}`; params.push(type); }

      query += ` ORDER BY ft.date DESC, ft.created_at DESC`;

      const result = await pool.query(query, params);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  };

  getNetProfit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const branchId = this.resolveBranchId(req);
      const { startDate, endDate } = req.query;

      if (!branchId) {
        res.status(400).json({ success: false, error: { code: 'BRANCH_REQUIRED', message: 'Please select a branch first.' } });
        return;
      }

      const result = await auditorService.getNetProfit(branchId, {
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}

export default new AuditorController();
