import pool from '../config/database';
import schoolAdminService from './schoolAdmin.service';
import { gregorianToEthiopic, todayEthiopic } from '../utils/ethiopicUtils';
import { generateCredentials } from '../utils/credentialGenerator';
import { gregorianToEthiopian, ethiopianToGregorianDate } from '../shared/ethiopianCalendar';

class FinanceClerkService {
  // Get available aid allocations for a student (active allocations with remaining balance)
  private async getAvailableAid(client: any, studentId: string) {
    const res = await client.query(
      `SELECT id, approved_amount, used_amount, (approved_amount - used_amount) AS remaining
       FROM student_aids
       WHERE student_id = $1 AND status = 'active' AND approved_amount > used_amount
       ORDER BY approved_at ASC NULLS LAST`,
      [studentId]
    );
    const rows = res.rows || [];
    const totalRemaining = rows.reduce((s: number, r: any) => s + Number(r.remaining || 0), 0);
    return { allocations: rows, totalRemaining };
  }
  /**
   * Returns the registration fee due for a given billing month.
   *
   * Two cases:
   *   A) First-time admission: due in the student's Ethiopian enrollment month only,
   *      and only if they have never paid a registration fee before.
   *   B) Annual Pagume charge: due every year when targetMonth is an Ethiopian Pagume
   *      month (ends in "-13"), provided:
   *        • The student was NOT enrolled during this same Pagume period (they pay
   *          via the admission flow instead).
   *        • They have not already paid the registration fee for this specific Pagume year.
   *
   * Registration fees NEVER contribute to penalty calculations — see getPenaltyDueForMonth.
   */
  /**
   * Summer billing window: Hamle (Eth month 11), Nehase (12), Pagume (13).
   * Stored in DB as YYYY-11, YYYY-12, YYYY-13.
   * Returns the three summer-month keys for the Ethiopian year that contains targetMonth.
   */
  private getSummerMonths(targetYear: number, _targetMonthNum: number): string[] {
    return [`${targetYear}-11`, `${targetYear}-12`, `${targetYear}-13`];
  }

  private async getRegistrationDueForMonth(
    client: any, studentId: string, branchId: string, targetMonth: string
  ): Promise<number> {
    const enrollRes = await client.query(`SELECT created_at, grade FROM students WHERE id = $1`, [studentId]);
    if (enrollRes.rows.length === 0) return 0;

    const student = enrollRes.rows[0];
    const enrollmentMonth = this.getStudentEnrollmentMonth(student.created_at);
    const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
    const targetYearStr = targetMonth.split('-')[0];

    // Check if the student has paid a registration fee in ANY month of this academic year (one-time fee)
    const paidRes = await client.query(
      `SELECT 1 FROM payments p
       JOIN payment_items pi ON pi.payment_id = p.id
       WHERE p.student_id = $1 AND p.month LIKE $2 AND pi.fee_type = 'registration'
       LIMIT 1`,
      [studentId, `${targetYearStr}-%`]
    );
    if (paidRes.rows.length > 0) return 0;

    const isSummer = targetMonthNum === 11 || targetMonthNum === 12 || targetMonthNum === 13;
    const summerMonths = this.getSummerMonths(targetYear, targetMonthNum);

    if (isSummer) {
      const reg = await this.getGlobalRegistrationFee(branchId, student.grade).catch(() => ({ amount: 0 }));
      return Number(reg.amount || 0);

    } else if (targetMonth === enrollmentMonth) {
      // First-time admission month charge
      const reg = await this.getGlobalRegistrationFee(branchId, student.grade).catch(() => ({ amount: 0 }));
      return Number(reg.amount || 0);

    } else {
      // Carry-over: student did not pay during summer, now in a later month.
      // The fee is still owed as a single one-time charge — never 3x.
      // Only apply carry-over when summer records exist.
      const summerExistsRes = await client.query(
        `SELECT 1 FROM student_collections WHERE student_id = $1 AND month = ANY($2::text[]) LIMIT 1`,
        [studentId, summerMonths]
      );
      if (summerExistsRes.rows.length === 0) return 0; // No summer billing → no carry-over

      const reg = await this.getGlobalRegistrationFee(branchId, student.grade).catch(() => ({ amount: 0 }));
      return Number(reg.amount || 0);
    }
  }

  private async getFinanceSettingNumber(key: string, defaultValue = 0): Promise<number> {
    const result = await pool.query(`SELECT value FROM finance_settings WHERE key = $1 LIMIT 1`, [key]);
    const value = Number(result.rows[0]?.value);
    return Number.isFinite(value) && value > 0 ? value : defaultValue;
  }

  /**
   * Convert a date string that may be Ethiopian (YYYY-MM-DD EC) to a Gregorian ISO date string.
   * The frontend sends dates formatted with getTodayEthiopianDate() which returns EC dates like "2018-09-25".
   * EC years are ~7-8 years behind Gregorian, so any year < 2015 is treated as Ethiopian.
   * Years >= 2015 are assumed already Gregorian (safe cut-off for this system).
   */
  private ethiopianDateStringToGregorian(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().slice(0, 10);
    // Strip any " EC" suffix if present
    const cleaned = dateStr.replace(/\s*EC\s*$/i, '').trim();
    const parts = cleaned.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return new Date().toISOString().slice(0, 10);
    const [y, m, d] = parts;
    // Ethiopian years for this school system are in the 2000–2030 range.
    // Gregorian years for dates relevant to this system start at 2020+.
    // If year < 2015, treat as Ethiopian and convert; otherwise assume Gregorian.
    if (y < 2015) {
      try {
        const gregDate = ethiopianToGregorianDate({ year: y, month: m, day: d });
        return gregDate.toISOString().slice(0, 10);
      } catch {
        return new Date().toISOString().slice(0, 10);
      }
    }
    // Already Gregorian
    return cleaned;
  }

  private getEthiopianMonthLength(year: number, month: number) {
    return month === 13 ? (year % 4 === 3 ? 6 : 5) : 30;
  }

  private getPaymentDueDateForMonth(month: string, deadlineDay: number) {
    const [year, monthIndex] = month.split('-').map(Number);
    const day = Math.min(Math.max(1, deadlineDay), this.getEthiopianMonthLength(year, monthIndex));
    return ethiopianToGregorianDate({ year, month: monthIndex, day });
  }

  private getStudentEnrollmentMonth(createdAt: Date | string): string {
    const dateObj = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const ethDate = gregorianToEthiopian(dateObj);
    return `${ethDate.year}-${String(ethDate.month).padStart(2, '0')}`;
  }

  async syncStudentCollectionsAcrossAllMonths(client: any, studentId: string, branchId: string) {
    const studentRes = await client.query(
      `SELECT s.id, s.grade, s.branch_id, s.is_bus_user, s.created_at, s.penalty_fee,
         COALESCE(
           NULLIF(s.monthly_fee, 0),
           (
             SELECT monthly_fee FROM branch_grade_fees 
             WHERE branch_id = s.branch_id 
               AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
             LIMIT 1
           ),
           0
         ) AS monthly_fee,
         CASE WHEN s.is_bus_user = TRUE THEN
           COALESCE(
             NULLIF(s.bus_fee, 0),
             (
               SELECT bus_fee FROM branch_grade_fees 
               WHERE branch_id = s.branch_id 
                 AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
               LIMIT 1
             ),
             0
           )
         ELSE 0 END AS bus_fee,
         s.fee_status, s.fee_approval_status, s.requested_aid_amount
       FROM students s
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) return;
    const student = studentRes.rows[0];

    const existingMonthsRes = await client.query(
      `SELECT month, status FROM student_collections WHERE student_id = $1`,
      [studentId]
    );
    const monthsStatusMap = new Map<string, string>(
      existingMonthsRes.rows.map((r: any) => [r.month, r.status])
    );
    const months = Array.from(monthsStatusMap.keys());

    const ethNow = gregorianToEthiopian(new Date());
    const currentMonth = `${ethNow.year}-${String(ethNow.month).padStart(2, '0')}`;
    if (!months.includes(currentMonth)) {
      months.push(currentMonth);
    }

    // During Pagume (Ethiopian month 13), ensure its special month key is included
    if (ethNow.month === 13) {
      const pagume = `${ethNow.year}-13`;
      if (!months.includes(pagume)) {
        months.push(pagume);
      }
    }

    // During the Ethiopian summer billing window (Hamle=11, Nehase=12, Pagume=13),
    // ensure all three summer-month records exist so the Registration Fee page is populated.
    if (ethNow.month === 11 || ethNow.month === 12 || ethNow.month === 13) {
      const summerKeys = [
        `${ethNow.year}-11`,
        `${ethNow.year}-12`,
        `${ethNow.year}-13`
      ];
      for (const sk of summerKeys) {
        if (!months.includes(sk)) months.push(sk);
      }
    }

    const deadlineDay = await this.getFinanceSettingNumber('student_payment_deadline', 10);
    const now = new Date();

    for (const month of months) {
      if (monthsStatusMap.get(month) === 'cleared') {
        continue;
      }
      // Use computeMonthlyFeesOutstanding to exclude registration fee from collection status
      const outstandingTotal = await this.computeMonthlyFeesOutstanding(client, student, branchId, month, now);
      const dueDate = this.getPaymentDueDateForMonth(month, deadlineDay);
      let status = 'in_collections';
      const [_, mNum] = month.split('-').map(Number);
      if (outstandingTotal <= 0) {
        status = 'cleared';
      } else if (now > dueDate) {
        status = (mNum === 11 || mNum === 12 || mNum === 13) ? 'in_collections' : 'overdue';
      }

      await client.query(
        `INSERT INTO student_collections (student_id, month, due_date, status, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (student_id, month)
         DO UPDATE SET status = EXCLUDED.status, due_date = EXCLUDED.due_date, updated_at = NOW()`,
        [studentId, month, dueDate.toISOString().slice(0, 10), status]
      );
    }
  }

  async getPenaltyDueForMonth(client: any, student: any, month: string, now = new Date()) {
    const [_, monthNum] = month.split('-').map(Number);
    if (monthNum === 11 || monthNum === 12 || monthNum === 13) return 0; // No penalty for summer months

    const deadlineDay = await this.getFinanceSettingNumber('student_payment_deadline', 10);
    const dueDate = this.getPaymentDueDateForMonth(month, deadlineDay);

    // If today (now) is before or on the deadline, no penalty is due yet
    if (now <= dueDate) {
      return 0;
    }

    // Safeguard: If student enrolled after the deadline of the billing month, do not charge penalty for this month
    if (student.created_at && new Date(student.created_at) > dueDate) {
      return 0;
    }

    // Now we are past the deadline. Let's see if the student paid their base fees on time.
    // NOTE: Registration fees are intentionally EXCLUDED from baseDue — they never trigger
    // a late penalty regardless of when they are paid (business rule: no penalty on reg fee).
    const monthlyDue = Number(student.monthly_fee || 0);
    const busDue = student.is_bus_user ? Number(student.bus_fee || 0) : 0;
    const baseDue = monthlyDue + busDue;

    // Sum all payments and aid usages made on or before the deadline
    const onTimePaidRes = await client.query(
      `SELECT COALESCE(
         (SELECT SUM(pi.amount)
          FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
          WHERE p.student_id = $1 AND p.month = $2 AND p.date <= $3),
         0
       ) + COALESCE(
         (SELECT SUM(sau.amount)
          FROM student_aid_usages sau
          LEFT JOIN payments p ON sau.payment_id = p.id
          WHERE sau.student_id = $1 AND sau.month = $2 AND (p.date IS NULL OR p.date <= $3)),
         0
       ) AS total_on_time`,
      [student.id, month, dueDate.toISOString().slice(0, 10)]
    );
    const onTimePaid = Number(onTimePaidRes.rows[0].total_on_time || 0);

    // If onTimePaid covers baseDue, no penalty applies
    if (onTimePaid >= baseDue) {
      return 0;
    }

    // Otherwise, penalty applies
    const penaltyRate = await this.getFinanceSettingNumber('student_late_penalty_rate', 0);
    const defaultPenalty = Number(student.penalty_fee || 0) || penaltyRate;
    return defaultPenalty;
  }

  private async computeMonthlyOutstanding(client: any, student: any, branchId: string, month: string, now = new Date()) {
    const feeTypes = ['monthly', 'bus', 'penalty', 'registration'];
    let outstandingTotal = 0;

    const penaltyDue = await this.getPenaltyDueForMonth(client, student, month, now);
    const [_, monthNum] = month.split('-').map(Number);
    const isSummer = monthNum === 11 || monthNum === 12 || monthNum === 13;

    for (const ft of feeTypes) {
      let due = 0;
      if (ft === 'monthly') due = isSummer ? 0 : Number(student.monthly_fee || 0);
      else if (ft === 'bus') due = (isSummer || !student.is_bus_user) ? 0 : Number(student.bus_fee || 0);
      else if (ft === 'penalty') due = isSummer ? 0 : penaltyDue;
      else if (ft === 'registration') due = await this.getRegistrationDueForMonth(client, student.id, branchId, month);

      const paidRes = await client.query(
        `SELECT COALESCE(SUM(pi.amount),0) as paid
         FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
         WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = $3`,
        [student.id, month, ft]
      );

      let paid = Number(paidRes.rows[0].paid || 0);
      if (ft === 'monthly') {
        const aidPaidRes = await client.query(
          `SELECT COALESCE(SUM(amount),0) as paid
           FROM student_aid_usages
           WHERE student_id = $1 AND month = $2`,
          [student.id, month]
        );
        paid += Number(aidPaidRes.rows[0].paid || 0);
      }

      outstandingTotal += Math.max(0, due - paid);
    }

    return outstandingTotal;
  }

  /**
   * Compute outstanding for MONTHLY FEES ONLY (monthly, bus, penalty)
   * EXCLUDES registration fee - which is a one-time fee that should NOT affect collection status
   * This method is used to determine if a month's collection_status should be 'cleared'
   */
  private async computeMonthlyFeesOutstanding(
    client: any, student: any, branchId: string, month: string, now = new Date()
  ) {
    // Only include recurring monthly fees, NOT registration (one-time fee)
    const feeTypes = ['monthly', 'bus', 'penalty'];
    let outstandingTotal = 0;

    const penaltyDue = await this.getPenaltyDueForMonth(client, student, month, now);
    const [_, monthNum] = month.split('-').map(Number);
    const isSummer = monthNum === 11 || monthNum === 12 || monthNum === 13;

    for (const ft of feeTypes) {
      let due = 0;
      if (ft === 'monthly') {
        const standardFee = isSummer ? 0 : Number(student.monthly_fee || 0);
        const dedRes = await client.query(
          `SELECT COALESCE(approved_amount, 0) as approved_amount
           FROM fee_deductions
           WHERE student_id = $1 AND month = $2 AND status = 'approved'`,
          [student.id, month]
        );
        const approvedDeduction = Number(dedRes.rows[0]?.approved_amount || 0);
        due = Math.max(0, standardFee - approvedDeduction);
      }
      else if (ft === 'bus') due = (isSummer || !student.is_bus_user) ? 0 : Number(student.bus_fee || 0);
      else if (ft === 'penalty') due = isSummer ? 0 : penaltyDue;

      const paidRes = await client.query(
        `SELECT COALESCE(SUM(pi.amount),0) as paid
         FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
         WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = $3`,
        [student.id, month, ft]
      );

      let paid = Number(paidRes.rows[0].paid || 0);
      if (ft === 'monthly') {
        const aidPaidRes = await client.query(
          `SELECT COALESCE(SUM(amount),0) as paid
           FROM student_aid_usages
           WHERE student_id = $1 AND month = $2`,
          [student.id, month]
        );
        paid += Number(aidPaidRes.rows[0].paid || 0);
      }

      outstandingTotal += Math.max(0, due - paid);
    }

    return outstandingTotal;
  }

  // Record an itemized payment and update collections status
  async recordPayment(data: {
    studentId: string;
    items: { feeType: string; amount: number }[];
    month: string; // YYYY-MM
    date?: string;
    reference?: string;
    verifiedBy: string;
    branchId: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock student row and fetch fees (standard fallbacks from branch_grade_fees if not overridden)
      const studentRes = await client.query(
        `SELECT s.id, s.grade, s.branch_id, s.parent_phone, u.name, s.is_bus_user, s.created_at,
           COALESCE(
             NULLIF(s.monthly_fee, 0),
             (
               SELECT monthly_fee FROM branch_grade_fees 
               WHERE branch_id = s.branch_id 
                 AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
               LIMIT 1
             ),
             0
           ) AS monthly_fee,
           CASE WHEN s.is_bus_user = TRUE THEN
             COALESCE(
               NULLIF(s.bus_fee, 0),
               (
                 SELECT bus_fee FROM branch_grade_fees 
                 WHERE branch_id = s.branch_id 
                   AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
                 LIMIT 1
               ),
               0
             )
           ELSE 0 END AS bus_fee,
            s.penalty_fee,
            s.fee_status, s.fee_approval_status, s.requested_aid_amount
         FROM students s JOIN users u ON s.user_id = u.id
         WHERE s.id = $1 FOR UPDATE`,
        [data.studentId]
      );

      if (studentRes.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentRes.rows[0];

      // Enforce constraint: Penalty fees must be paid in full before paying other fees
      // Use the payment's own date as "now" so the penalty is anchored to when they actually paid
      const paymentNow = data.date ? new Date(data.date) : new Date();
      const penaltyDue = await this.getPenaltyDueForMonth(client, student, data.month, paymentNow);
      const penaltyPaidRes = await client.query(
        `SELECT COALESCE(SUM(pi.amount), 0) AS paid
         FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
         WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = 'penalty'`,
        [data.studentId, data.month]
      );
      const penaltyAlreadyPaid = Number(penaltyPaidRes.rows[0].paid || 0);
      const penaltyOutstanding = Math.max(0, penaltyDue - penaltyAlreadyPaid);

      if (penaltyOutstanding > 0) {
        const penaltyPaymentItem = data.items.find(it => it.feeType === 'penalty');
        const penaltyPaidInTx = penaltyPaymentItem ? Number(penaltyPaymentItem.amount) : 0;
        const penaltyRemainingAfterTx = Math.max(0, penaltyOutstanding - penaltyPaidInTx);

        if (penaltyRemainingAfterTx > 0) {
          const payingOtherFees = data.items.some(it => it.feeType !== 'penalty' && Number(it.amount) > 0);
          if (payingOtherFees) {
            throw new Error('Outstanding penalty fees must be fully settled before other payments can be cleared.');
          }
        }
      }

      // Validate and compute totals
      let totalRequested = 0;
      const toInsertItems: { feeType: string; amount: number }[] = [];

      // Fetch available aid for this student
      const aidInfo = await this.getAvailableAid(client, data.studentId);
      const aidAvailable = Number(aidInfo.totalRemaining || 0);

      for (const it of data.items) {
        const feeType = it.feeType;
        const amt = Number(it.amount) || 0;

        // Determine amount due for fee type
        let dueForType = 0;
        if (feeType === 'monthly') {
          const standardFee = Number(student.monthly_fee || 0);
          const dedRes = await client.query(
            `SELECT COALESCE(approved_amount, 0) as approved_amount
             FROM fee_deductions
             WHERE student_id = $1 AND month = $2 AND status = 'approved'`,
            [data.studentId, data.month]
          );
          const approvedDeduction = Number(dedRes.rows[0]?.approved_amount || 0);
          dueForType = Math.max(0, standardFee - approvedDeduction);
        }
        else if (feeType === 'bus') dueForType = Number(student.bus_fee || 0);
        else if (feeType === 'penalty') dueForType = await this.getPenaltyDueForMonth(client, student, data.month, paymentNow);
        else if (feeType === 'registration') {
          dueForType = await this.getRegistrationDueForMonth(client, data.studentId, data.branchId, data.month);
        } else {
          // Unknown fee type — accept provided amount as a custom charge
          dueForType = amt;
        }

        // Amount already paid for this fee type in the same month
        const paidRes = await client.query(
          `SELECT COALESCE(SUM(pi.amount),0) AS paid
           FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
           WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = $3`,
          [data.studentId, data.month, feeType]
        );

        const alreadyPaid = Number(paidRes.rows[0].paid || 0);
        const remaining = Math.max(0, dueForType - alreadyPaid);

        const payAmount = Math.min(amt, remaining);
        if (payAmount <= 0) continue;

        totalRequested += payAmount;
        toInsertItems.push({ feeType, amount: payAmount });
      }

      if (toInsertItems.length === 0) {
        throw new Error('All requested fee types are already fully paid or no valid amount was provided.');
      }

      // Determine aid to apply (do not double-apply aid)
      const aidToApply = Math.min(aidAvailable, totalRequested);

      // Distribute aid across requested items proportionally
      const sumRequested = totalRequested;
      let remainingAid = aidToApply;
      const itemsToPersist: { feeType: string; cashAmount: number; aidApplied: number }[] = [];
      for (let i = 0; i < toInsertItems.length; i++) {
        const it = toInsertItems[i];
        const proportion = sumRequested > 0 ? it.amount / sumRequested : 0;
        // For last item, use leftover to avoid rounding issues
        const aidForItem = i === toInsertItems.length - 1 ? remainingAid : Math.round((proportion * aidToApply) * 100) / 100;
        remainingAid = Math.round((remainingAid - aidForItem) * 100) / 100;
        const cashForItem = Math.round((it.amount - (aidForItem || 0)) * 100) / 100;
        itemsToPersist.push({ feeType: it.feeType, cashAmount: cashForItem, aidApplied: aidForItem || 0 });
      }

      const totalCashCollected = itemsToPersist.reduce((s, it) => s + Number(it.cashAmount || 0), 0);

      // Create payment with actual cash collected.
      // IMPORTANT: data.date arrives from the frontend as an Ethiopian calendar string (e.g. "2018-09-25").
      // We must convert it to Gregorian before storing so that date-range comparisons in
      // getPenaltyDueForMonth (p.date <= Gregorian_deadline) work correctly.
      const paymentDateGregorian = this.ethiopianDateStringToGregorian(data.date || '');
      const paymentRes = await client.query(
        `INSERT INTO payments (student_id, payer_id, branch_id, month, date, total_amount, reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [data.studentId, null, data.branchId, data.month, paymentDateGregorian, totalCashCollected, data.reference || null]
      );
      const payment = paymentRes.rows[0];

      // Insert items as cash amounts per fee type
      for (const it of itemsToPersist) {
        if (it.cashAmount && it.cashAmount > 0) {
          await client.query(
            `INSERT INTO payment_items (payment_id, fee_type, amount) VALUES ($1, $2, $3)`,
            [payment.id, it.feeType, it.cashAmount]
          );
        }
      }

      // Persist aid usage records and decrement allocations (consume allocations FIFO)
      if (aidToApply > 0) {
        let aidRemainingToConsume = aidToApply;
        for (const alloc of aidInfo.allocations) {
          if (aidRemainingToConsume <= 0) break;
          const allocRemaining = Number(alloc.remaining || 0);
          if (allocRemaining <= 0) continue;
          const consume = Math.min(allocRemaining, aidRemainingToConsume);
          // Insert usage record
          await client.query(
            `INSERT INTO student_aid_usages (student_aid_id, payment_id, student_id, amount, month)
             VALUES ($1, $2, $3, $4, $5)`,
            [alloc.id, payment.id, data.studentId, consume, data.month]
          );
          // Update allocation used_amount
          await client.query(`UPDATE student_aids SET used_amount = used_amount + $1, updated_at = NOW() WHERE id = $2`, [consume, alloc.id]);
          aidRemainingToConsume = Math.round((aidRemainingToConsume - consume) * 100) / 100;
        }
      }

      // Also record a finance_transactions summary (backwards compatibility) - amount is cash collected
      // Use the same converted Gregorian date as the payment for consistency
      const actualGregorianDateStr = paymentDateGregorian;
      const ethDate = gregorianToEthiopic(new Date(actualGregorianDateStr));

      for (const it of itemsToPersist) {
        if (it.cashAmount && it.cashAmount > 0) {
          let displayType = 'Payment';
          if (it.feeType === 'monthly') displayType = 'Monthly Tuition';
          else if (it.feeType === 'bus') displayType = 'Bus Fee';
          else if (it.feeType === 'penalty') displayType = 'Penalty Fee';
          else if (it.feeType === 'registration') displayType = 'Registration Fee';
          else displayType = it.feeType.charAt(0).toUpperCase() + it.feeType.slice(1);

          await client.query(
            `INSERT INTO finance_transactions (student_id, student_name, amount, type, date, verified_by, branch_id, ethiopic_month, ethiopic_year)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [data.studentId, student.name, it.cashAmount, `${displayType} (${data.month})`, actualGregorianDateStr, data.verifiedBy, data.branchId, ethDate.month, ethDate.year]
          );
        }
      }

      // Recompute outstanding MONTHLY FEES ONLY (excluding registration) and update student_collections for the paid month
      // Registration is a one-time fee and should NOT affect collection status
      const outstandingTotal = await this.computeMonthlyFeesOutstanding(client, student, data.branchId, data.month);
      const deadlineDay = await this.getFinanceSettingNumber('student_payment_deadline', 10);
      const dueDate = this.getPaymentDueDateForMonth(data.month, deadlineDay);
      const now = new Date();
      let status = 'in_collections';
      const [_, outMonthNum] = data.month.split('-').map(Number);
      if (outstandingTotal <= 0) status = 'cleared';
      else if (now > dueDate) status = (outMonthNum === 11 || outMonthNum === 12 || outMonthNum === 13) ? 'in_collections' : 'overdue';

      await client.query(
        `INSERT INTO student_collections (student_id, month, due_date, status, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (student_id, month) DO UPDATE SET status = EXCLUDED.status, due_date = EXCLUDED.due_date, updated_at = NOW()`,
        [data.studentId, data.month, dueDate.toISOString().slice(0, 10), status]
      );

      // ── Summer / carry-over cross-month settlement ────────────────────────────
      // Registration fee is a ONE-TIME annual charge. If paid in any summer month
      // (Hamle 11, Nehase 12, Pagume 13) OR as a carry-over in a later month,
      // all three summer records are auto-cleared. No 3× charging.
      const paidRegFee = toInsertItems.some(it => it.feeType === 'registration');
      if (paidRegFee && status === 'cleared') {
        const [pyStr, pmStr] = data.month.split('-');
        const summerMonths = this.getSummerMonths(parseInt(pyStr), parseInt(pmStr));
        for (const sm of summerMonths) {
          if (sm !== data.month) {
            const smDue = this.getPaymentDueDateForMonth(sm, deadlineDay);
            await client.query(
              `INSERT INTO student_collections (student_id, month, due_date, status, updated_at)
               VALUES ($1, $2, $3, 'cleared', NOW())
               ON CONFLICT (student_id, month)
               DO UPDATE SET status = 'cleared', due_date = EXCLUDED.due_date, updated_at = NOW()`,
              [data.studentId, sm, smDue.toISOString().slice(0, 10)]
            );
          }
        }
      }

      // Also re-sync every OTHER overdue month for this student so paying the final balance
      // immediately removes the student from the Overdue tab.
      const otherOverdueRes = await client.query(
        `SELECT month FROM student_collections
         WHERE student_id = $1 AND status = 'overdue' AND month <> $2`,
        [data.studentId, data.month]
      );
      for (const row of otherOverdueRes.rows) {
        const otherMonth: string = row.month;
        // Use computeMonthlyFeesOutstanding to exclude registration fee from collection status calculation
        const otherOutstanding = await this.computeMonthlyFeesOutstanding(client, student, data.branchId, otherMonth);
        const otherDueDate = this.getPaymentDueDateForMonth(otherMonth, deadlineDay);
        let otherStatus = 'in_collections';
        const [__, otherMonthNum] = otherMonth.split('-').map(Number);
        if (otherOutstanding <= 0) otherStatus = 'cleared';
        else if (now > otherDueDate) otherStatus = (otherMonthNum === 11 || otherMonthNum === 12 || otherMonthNum === 13) ? 'in_collections' : 'overdue';
        await client.query(
          `UPDATE student_collections SET status = $1, updated_at = NOW()
           WHERE student_id = $2 AND month = $3`,
          [otherStatus, data.studentId, otherMonth]
        );
      }

      await client.query('COMMIT');

      return {
        payment: {
          ...payment,
          items: toInsertItems
        },
        outstanding: outstandingTotal,
        collectionStatus: status
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get itemized payment history for a student
  async getPaymentHistory(studentId: string) {
    const result = await pool.query(
      `SELECT p.*, 
        COALESCE(json_agg(json_build_object('feeType', pi.fee_type, 'amount', pi.amount)) FILTER (WHERE pi.id IS NOT NULL), '[]') AS items
       FROM payments p
       LEFT JOIN payment_items pi ON pi.payment_id = p.id
       WHERE p.student_id = $1
       GROUP BY p.id
       ORDER BY p.date DESC, p.created_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  // Get outstanding amounts per fee type for a student for a given month
  async getStudentOutstanding(studentId: string, month?: string) {
    const ethNow = gregorianToEthiopian(new Date());
    const targetMonth = month || `${ethNow.year}-${String(ethNow.month).padStart(2, '0')}`;

    // Fetch student fees - bus fee is 0 if student doesn't use transport
    const studentRes = await pool.query(
      `SELECT s.id, s.grade, s.is_bus_user, s.branch_id, s.parent_phone, s.created_at, u.name,
         COALESCE(
           NULLIF(s.monthly_fee, 0),
           (
             SELECT monthly_fee FROM branch_grade_fees 
             WHERE branch_id = s.branch_id 
               AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
             LIMIT 1
           ),
           0
         ) AS monthly_fee,
         CASE WHEN s.is_bus_user = TRUE THEN
           COALESCE(
             NULLIF(s.bus_fee, 0),
             (
               SELECT bus_fee FROM branch_grade_fees 
               WHERE branch_id = s.branch_id 
                 AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
               LIMIT 1
             ),
             0
           )
         ELSE 0 END AS bus_fee,
            s.penalty_fee,
            s.fee_status, s.fee_approval_status, s.requested_aid_amount
         FROM students s JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) throw new Error('Student not found');
    const student = studentRes.rows[0];

    // Acquire a client for methods that need transactional context
    const client = await pool.connect();
    try {

      // Fee types to report
      const [_, monthNum] = targetMonth.split('-').map(Number);
      const isSummer = monthNum === 11 || monthNum === 12 || monthNum === 13;

      const penaltyDue = isSummer ? 0 : await this.getPenaltyDueForMonth(client, student, targetMonth);
      const registrationDue = await this.getRegistrationDueForMonth(client, studentId, student.branch_id, targetMonth);
      
      const dedRes = await client.query(
        `SELECT COALESCE(approved_amount, 0) as approved_amount
         FROM fee_deductions
         WHERE student_id = $1 AND month = $2 AND status = 'approved'`,
        [studentId, targetMonth]
      );
      const approvedDeduction = Number(dedRes.rows[0]?.approved_amount || 0);
      const monthlyDue = Math.max(0, (isSummer ? 0 : Number(student.monthly_fee || 0)) - approvedDeduction);

      const feeTypes = [
        { key: 'monthly', label: 'Monthly Tuition', due: monthlyDue },
        { key: 'registration', label: 'Registration Fee', due: registrationDue },
        { key: 'bus', label: 'Bus Fee', due: (isSummer || !student.is_bus_user) ? 0 : Number(student.bus_fee || 0) },
        { key: 'penalty', label: 'Penalty Fee', due: penaltyDue }
      ];

      const feesWithPaid: any[] = [];
      const paidFees: string[] = [];
      let totalDue = 0;
      let totalPaid = 0;

      for (const ft of feeTypes) {
        totalDue += Number(ft.due || 0);
        const paidRes = await pool.query(
          `SELECT COALESCE(SUM(pi.amount),0) as paid
         FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
         WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = $3`,
          [studentId, targetMonth, ft.key]
        );
        let paid = Number(paidRes.rows[0].paid || 0);
        // Include aid usages in monthly tuition paid total
        if (ft.key === 'monthly') {
          const aidRes2 = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS paid FROM student_aid_usages WHERE student_id=$1 AND month=$2`,
            [studentId, targetMonth]
          );
          paid += Number(aidRes2.rows[0].paid || 0);
        }
        const remaining = Math.max(0, Number(ft.due || 0) - paid);

        totalPaid += paid;
        feesWithPaid.push({
          feeType: ft.key,
          label: ft.label,
          due: Number(ft.due || 0),
          paid,
          remaining,
          isFullyPaid: Number(ft.due || 0) > 0 && remaining === 0
        });

        if (Number(ft.due || 0) > 0 && remaining === 0) {
          paidFees.push(ft.key);
        }
      }

      // Also pull collection status
      const collRes = await pool.query(`SELECT status, due_date FROM student_collections WHERE student_id = $1 AND month = $2`, [studentId, targetMonth]);
      const collection = collRes.rows[0] || null;

      // Pull aid allocations summary for the student
      const aidRes = await pool.query(
        `SELECT COALESCE(SUM(approved_amount),0)::numeric AS approved_total, COALESCE(SUM(used_amount),0)::numeric AS used_total
       FROM student_aids WHERE student_id = $1 AND status = 'active'`,
        [studentId]
      );
      const approvedAidTotal = Number(aidRes.rows[0]?.approved_total || 0);
      const aidUsed = Number(aidRes.rows[0]?.used_total || 0);
      const aidRemaining = Math.max(0, approvedAidTotal - aidUsed);

      return {
        student: { id: student.id, name: student.name, parent_phone: student.parent_phone },
        usesTransport: !!student.is_bus_user,
        month: targetMonth,
        fees: feesWithPaid,
        paidFees,
        totalDue,
        totalPaid,
        totalRemaining: Math.max(0, totalDue - totalPaid),
        // Aid summary
        approvedAidTotal,
        aidUsed,
        aidRemaining,
        collection
      };

    } finally {
      client.release();
    }
  }

  // Get students with fee information
  async getStudentsWithFees(branchId?: string | null, search?: string, feeStatus?: string, grade?: string) {
    const ethNow = gregorianToEthiopian(new Date());
    const month = `${ethNow.year}-${String(ethNow.month).padStart(2, '0')}`;
    try {
      await this.syncCollectionStatusesForMonth(month, branchId || undefined);
    } catch (e) {
      console.error('Failed to sync collection statuses:', e);
    }

    let query = `
      SELECT 
        s.id, s.grade, s.branch_id, s.is_bus_user,
        GREATEST(0, COALESCE(
          NULLIF(s.monthly_fee, 0),
          (
            SELECT monthly_fee FROM branch_grade_fees 
            WHERE branch_id = s.branch_id 
              AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
            LIMIT 1
          ),
          0
        ) - COALESCE(
          (SELECT approved_amount FROM fee_deductions WHERE student_id = s.id AND month = $1 AND status = 'approved'),
          0
        )) AS monthly_fee,
        CASE WHEN s.is_bus_user = TRUE THEN
          COALESCE(
            NULLIF(s.bus_fee, 0),
            (
              SELECT bus_fee FROM branch_grade_fees 
              WHERE branch_id = s.branch_id 
                AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
              LIMIT 1
            ),
            0
          )
        ELSE 0 END AS bus_fee,
        s.penalty_fee,
        s.fee_status, s.fee_approval_status, s.fee_notes, s.requested_aid_amount,
        s.parent_phone,
        u.name, u.email, u.digital_id,
        sc.status AS collection_status
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN student_collections sc ON sc.student_id = s.id AND sc.month = $1
      WHERE 1=1
    `;

    const params: any[] = [month];
    let paramCount = 1;

    if (branchId) {
      paramCount++;
      query += ` AND s.branch_id = $${paramCount}`;
      params.push(branchId);
    }

    if (feeStatus && feeStatus !== 'all') {
      paramCount++;
      query += ` AND s.fee_status::text = $${paramCount}`;
      params.push(feeStatus);
    }

    if (grade && grade !== 'all') {
      paramCount++;
      query += ` AND s.grade = $${paramCount}`;
      params.push(grade);
    }

    if (search && search && search.trim()) {
      paramCount++;
      const searchTerm = `%${search.trim()}%`;
      query += ` AND (u.name::text ILIKE $${paramCount} OR u.digital_id::text ILIKE $${paramCount})`;
      params.push(searchTerm);
    }

    query += ' ORDER BY u.name';

    const result = await pool.query(query, params);

    const penaltyRate = await this.getFinanceSettingNumber('student_late_penalty_rate', 0);
    const deadlineDay = await this.getFinanceSettingNumber('student_payment_deadline', 10);
    const dueDate = this.getPaymentDueDateForMonth(month, deadlineDay);
    const isPastDeadline = new Date() > dueDate;

    return result.rows.map((student: any) => {
      // Students without a collection record are still within their billing period → Pending
      const collStatus = student.collection_status || 'in_collections';

      let penalty = Number(student.penalty_fee || 0);
      // Only attach a non-zero penalty if we are past the deadline AND the student hasn't cleared their balance
      if (penalty === 0 && isPastDeadline && collStatus !== 'cleared') {
        penalty = penaltyRate;
      }
      return {
        ...student,
        collection_status: collStatus,
        penalty_fee: penalty
      };
    });
  }

  // Get transport students with current route/driver assignment
  async getTransportStudents(branchId: string, search?: string, status: 'assigned' | 'unassigned' | 'all' = 'assigned') {
    let query = `
      SELECT
        s.id,
        s.grade,
        s.bus_fee,
        s.is_bus_user,
        s.bus_start_date,
        u.name,
        u.email,
        u.digital_id,
        r.id AS route_id,
        r.name AS route_name,
        drv.id AS driver_id,
        drv.name AS driver_name,
        drv.digital_id AS driver_digital_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT sr.route_id
        FROM student_routes sr
        WHERE sr.student_id = s.id
        LIMIT 1
      ) sr ON TRUE
      LEFT JOIN routes r ON r.id = sr.route_id
      LEFT JOIN users drv ON drv.id = r.driver_id
      WHERE s.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (status !== 'all') {
      query += status === 'assigned' ? ' AND sr.route_id IS NOT NULL' : ' AND sr.route_id IS NULL';
    }

    if (search) {
      paramCount++;
      query += ` AND (
        u.name ILIKE $${paramCount}
        OR u.digital_id ILIKE $${paramCount}
        OR COALESCE(r.name, '') ILIKE $${paramCount}
        OR COALESCE(drv.name, '') ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY u.name';

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get routes with assigned drivers for transport management
  async getTransportRoutes(branchId: string, search?: string) {
    let query = `
      SELECT
        r.id AS route_id,
        r.name AS route_name,
        r.driver_id,
        drv.name AS driver_name,
        drv.digital_id AS driver_digital_id,
        COUNT(sr.student_id)::int AS student_count
      FROM routes r
      JOIN users drv ON drv.id = r.driver_id
      LEFT JOIN student_routes sr ON sr.route_id = r.id
      WHERE r.branch_id = $1
    `;

    const params: any[] = [branchId];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND (
        r.name ILIKE $${paramCount}
        OR drv.name ILIKE $${paramCount}
        OR drv.digital_id ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    query += `
      GROUP BY r.id, drv.id
      ORDER BY r.name
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get financial policies for transport fee lookup
  async getTransportPolicies(branchId: string) {
    const result = await pool.query(
      `SELECT grade_level, monthly_tuition, registration_fee, bus_fee, penalty_rate, academic_year, branch_id
       FROM financial_policies
       WHERE branch_id = $1
       ORDER BY academic_year DESC, grade_level`,
      [branchId]
    );

    if (result.rows.length > 0) {
      return result.rows;
    }

    // Fallback to branch_grade_fees if financial_policies is empty
    const fallbackResult = await pool.query(
      `SELECT grade_level, monthly_fee AS monthly_tuition, registration_fee, bus_fee, 
              0 AS penalty_rate, 'Current' AS academic_year, branch_id
       FROM branch_grade_fees
       WHERE branch_id = $1
       ORDER BY grade_level`,
      [branchId]
    );
    return fallbackResult.rows;
  }

  /** Resolve registration fee from DB (grade-specific → global setting → branch policy). */
  async resolveRegistrationFee(
    branchId: string,
    gradeApplying?: string | null
  ): Promise<{ amount: number; source: string }> {
    const gradeLevel = String(gradeApplying || '')
      .replace(/grade\s*/i, '')
      .replace(/\D/g, '')
      .trim();

    if (gradeLevel) {
      const gradeFee = await pool.query(
        `SELECT registration_fee
         FROM branch_grade_fees
         WHERE branch_id = $1 AND grade_level = $2
         LIMIT 1`,
        [branchId, gradeLevel]
      );
      const gradeAmount = Number(gradeFee.rows[0]?.registration_fee);
      if (gradeAmount > 0) {
        return {
          amount: gradeAmount,
          source: `branch_grade_fees (Grade ${gradeLevel})`
        };
      }
    }

    const settingsResult = await pool.query(
      `SELECT key, value
       FROM finance_settings
       WHERE key IN ('student_registration_fee', 'registration_fee')
       ORDER BY CASE key WHEN 'student_registration_fee' THEN 1 ELSE 2 END
       LIMIT 1`
    );

    if (settingsResult.rows.length > 0) {
      const setting = settingsResult.rows[0];
      const amount = Number(setting.value) || 0;
      if (amount > 0) {
        return { amount, source: `finance_settings.${setting.key}` };
      }
    }

    const policyQuery = gradeLevel
      ? `SELECT registration_fee
         FROM financial_policies
         WHERE branch_id = $1 AND grade_level = $2
         ORDER BY academic_year DESC
         LIMIT 1`
      : `SELECT registration_fee
         FROM financial_policies
         WHERE branch_id = $1
         ORDER BY academic_year DESC, grade_level NULLS FIRST
         LIMIT 1`;

    const policyParams = gradeLevel ? [branchId, gradeLevel] : [branchId];
    const policyResult = await pool.query(policyQuery, policyParams);
    const policyAmount = Number(policyResult.rows[0]?.registration_fee) || 0;

    return {
      amount: policyAmount,
      source: gradeLevel
        ? `financial_policies (Grade ${gradeLevel})`
        : 'financial_policies.registration_fee'
    };
  }

  async getGlobalRegistrationFee(
    branchId: string,
    gradeApplying?: string | null
  ): Promise<{ amount: number; source: string }> {
    return this.resolveRegistrationFee(branchId, gradeApplying);
  }

  // Assign or change a student's transport route and fee
  // Fee is determined by the Super Admin's financial policy for the student's grade
  async assignTransportStudent(data: {
    branchId: string;
    studentId: string;
    driverId: string;
    transportFee: number; // Ignored; fetched from policy
    verifiedBy: string;
    busStartDay?: number; // Optional: day of month when student starts using bus (1-30). Defaults to today's day.
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const studentResult = await client.query(
        `SELECT s.id, s.grade, u.name
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1 AND s.branch_id = $2
         FOR UPDATE`,
        [data.studentId, data.branchId]
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentResult.rows[0];

      // Fetch the Super Admin's financial policy fee for this student's grade
      const policyResult = await client.query(
        `SELECT bus_fee
         FROM financial_policies
         WHERE branch_id = $1
           AND (grade_level = $2 OR grade_level IS NULL)
         ORDER BY grade_level DESC NULLS LAST
         LIMIT 1`,
        [data.branchId, student.grade]
      );

      let policyFee = Number(policyResult.rows[0]?.bus_fee || 0);
      if (policyFee <= 0) {
        // Fallback to branch_grade_fees
        const normalizedGrade = student.grade ? student.grade.replace(/\D/g, '') : '';
        const gradeFeeResult = await client.query(
          `SELECT bus_fee FROM branch_grade_fees
           WHERE branch_id = $1
             AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = $2
           LIMIT 1`,
          [data.branchId, normalizedGrade]
        );
        policyFee = Number(gradeFeeResult.rows[0]?.bus_fee || 0);
      }

      if (policyFee <= 0) {
        throw new Error('No valid transport fee policy configured for this student grade');
      }

      const driverResult = await client.query(
        `SELECT id, name, digital_id
         FROM users
         WHERE id = $1 AND branch_id = $2 AND role = 'driver'`,
        [data.driverId, data.branchId]
      );

      if (driverResult.rows.length === 0) {
        throw new Error('Driver not found');
      }

      let routeResult = await client.query(
        `SELECT id, name
         FROM routes
         WHERE driver_id = $1 AND branch_id = $2
         LIMIT 1`,
        [data.driverId, data.branchId]
      );

      if (routeResult.rows.length === 0) {
        routeResult = await client.query(
          `INSERT INTO routes (name, driver_id, branch_id)
           VALUES ($1, $2, $3)
           RETURNING id, name`,
          [`Transport - ${driverResult.rows[0].name}`, data.driverId, data.branchId]
        );
      }

      await client.query('DELETE FROM student_routes WHERE student_id = $1', [data.studentId]);
      await client.query(
        'INSERT INTO student_routes (student_id, route_id) VALUES ($1, $2)',
        [data.studentId, routeResult.rows[0].id]
      );

      // Calculate bus_start_date based on provided day or today's Gregorian date
      let busStartDate = new Date().toISOString().slice(0, 10); // Default: today's Gregorian date
      if (data.busStartDay !== undefined && data.busStartDay >= 1 && data.busStartDay <= 30) {
        // If a specific day is provided, calculate the Gregorian date for that day in current month
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        const startDateObj = new Date(currentYear, currentMonth, data.busStartDay);
        busStartDate = startDateObj.toISOString().slice(0, 10);
      }

      await client.query(
        `UPDATE students
         SET bus_fee = $1,
             is_bus_user = TRUE,
             bus_start_date = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [policyFee, busStartDate, data.studentId]
      );

      await this.syncStudentCollectionsAcrossAllMonths(client, data.studentId, data.branchId);

      await client.query('COMMIT');

      return {
        studentId: data.studentId,
        studentName: student.name,
        routeId: routeResult.rows[0].id,
        routeName: routeResult.rows[0].name,
        driverName: driverResult.rows[0].name,
        transportFee: policyFee,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Stop transport and create a prorated settlement transaction
  async stopTransportStudent(data: {
    branchId: string;
    studentId: string;
    daysUsed: number;
    verifiedBy: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const studentResult = await client.query(
        `SELECT s.id, s.bus_fee, s.bus_start_date, u.name
         FROM students s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1 AND s.branch_id = $2
         FOR UPDATE`,
        [data.studentId, data.branchId]
      );

      if (studentResult.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = studentResult.rows[0];
      const transportFee = Number(student.bus_fee || 0);
      if (transportFee <= 0) {
        throw new Error('This student does not have an active transport fee');
      }

      // Calculate actual days used based on start_date and stop_date using Ethiopian calendar
      let actualDaysUsed = Number(data.daysUsed);
      if (student.bus_start_date) {
        const startEth = gregorianToEthiopian(new Date(student.bus_start_date));
        const stopEth = gregorianToEthiopian(new Date());
        
        if (startEth.year === stopEth.year && startEth.month === stopEth.month) {
          actualDaysUsed = stopEth.day - startEth.day + 1;
        } else {
          actualDaysUsed = stopEth.day;
        }
      }

      const clampedDaysUsed = Math.min(30, Math.max(0, actualDaysUsed));
      // Charge the student for the days used this month (prorated)
      const amountDue = Number(((clampedDaysUsed * transportFee) / 30).toFixed(2));

      await client.query('DELETE FROM student_routes WHERE student_id = $1', [data.studentId]);
      await client.query(
        `UPDATE students
         SET bus_fee = 0,
             is_bus_user = FALSE,
             bus_start_date = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [data.studentId]
      );

      const ethToday = todayEthiopic();
      await client.query(
        `INSERT INTO finance_transactions
          (student_id, student_name, amount, type, date, verified_by, branch_id, ethiopic_month, ethiopic_year)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8)`,
        [
          data.studentId,
          student.name,
          amountDue,
          'Transport Stop Charge',
          data.verifiedBy,
          data.branchId,
          ethToday.month,
          ethToday.year
        ]
      );

      await this.syncStudentCollectionsAcrossAllMonths(client, data.studentId, data.branchId);

      await client.query('COMMIT');

      return {
        studentId: data.studentId,
        studentName: student.name,
        daysUsed: clampedDaysUsed,
        transportFee,
        amountDue,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Update fee status
  async updateFeeStatus(studentId: string, data: {
    feeStatus?: string;
    monthlyFee?: number;
    busFee?: number;
    penaltyFee?: number;
    feeNotes?: string;
    requestedAidAmount?: number;
  }) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.feeStatus) {
      paramCount++;
      fields.push(`fee_status = $${paramCount}`);
      values.push(data.feeStatus);

      // If setting to reduced, set approval status to pending.
      // If setting back to standard, clear any previous fee reduction state.
      paramCount++;
      fields.push(`fee_approval_status = $${paramCount}`);
      values.push(data.feeStatus === 'reduced' ? 'pending' : 'none');
    }

    if (data.monthlyFee !== undefined) {
      paramCount++;
      fields.push(`monthly_fee = $${paramCount}`);
      values.push(data.monthlyFee);
    }

    if (data.busFee !== undefined) {
      paramCount++;
      fields.push(`bus_fee = $${paramCount}`);
      values.push(data.busFee);
    }

    if (data.penaltyFee !== undefined) {
      paramCount++;
      fields.push(`penalty_fee = $${paramCount}`);
      values.push(data.penaltyFee);
    }

    if (data.feeNotes) {
      paramCount++;
      fields.push(`fee_notes = $${paramCount}`);
      values.push(data.feeNotes);
    }

    if (data.requestedAidAmount !== undefined) {
      paramCount++;
      fields.push(`requested_aid_amount = $${paramCount}`);
      values.push(data.requestedAidAmount);
    }

    paramCount++;
    values.push(studentId);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE students SET ${fields.join(', ')}, updated_at = NOW()
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Student not found');
      }

      const student = result.rows[0];

      if (data.feeStatus === 'reduced') {
        const ethNow = gregorianToEthiopian(new Date());
        const currentMonth = `${ethNow.year}-${String(ethNow.month).padStart(2, '0')}`;
        await client.query(
          `INSERT INTO fee_deductions (student_id, month, requested_amount, approved_amount, status, approved_by, updated_at)
           VALUES ($1, $2, $3, 0, 'pending', null, NOW())
           ON CONFLICT (student_id, month) DO UPDATE SET 
             requested_amount = $3,
             status = 'pending',
             approved_amount = 0,
             approved_by = null,
             updated_at = NOW()`,
          [studentId, currentMonth, data.requestedAidAmount || 0]
        );
      } else if (data.feeStatus === 'standard') {
        const ethNow = gregorianToEthiopian(new Date());
        const currentMonth = `${ethNow.year}-${String(ethNow.month).padStart(2, '0')}`;
        await client.query(
          `DELETE FROM fee_deductions WHERE student_id = $1 AND month = $2`,
          [studentId, currentMonth]
        );
      }

      await this.syncStudentCollectionsAcrossAllMonths(client, student.id, student.branch_id);

      await client.query('COMMIT');
      return student;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get dashboard statistics
  async getDashboardStats(branchId: string) {
    // Today's collection
    const todayResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1 AND date = CURRENT_DATE`,
      [branchId]
    );

    // This month's revenue (Ethiopic)
    const ethToday = todayEthiopic();
    const monthResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM finance_transactions
       WHERE branch_id = $1 
       AND LOWER(ethiopic_month) = $2
       AND ethiopic_year = $3`,
      [branchId, ethToday.month.toLowerCase(), ethToday.year]
    );

    // Pending fee reductions
    const pendingResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM students
       WHERE branch_id = $1 AND fee_approval_status = 'pending'`,
      [branchId]
    );

    // Registrations (awaiting-payment applications)
    const registrationsResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM pending_applications
       WHERE branch_id = $1 AND status = 'awaiting-payment'`,
      [branchId]
    );

    // Overdue students
    const overdueResult = await pool.query(
      `SELECT COUNT(DISTINCT student_id) as count
       FROM student_collections sc
       JOIN students s ON s.id = sc.student_id
       WHERE s.branch_id = $1 AND sc.status = 'overdue'`,
      [branchId]
    );

    // Transport assigned students
    const transportResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) as count
       FROM students s
       JOIN student_routes sr ON sr.student_id = s.id
       WHERE s.branch_id = $1 AND s.is_bus_user = true`,
      [branchId]
    );

    // Staff in payroll (all branch staff in users table that are active)
    const staffResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM users u
       WHERE u.branch_id = $1 AND u.status = 'Approved'
       AND u.role IN ('teacher', 'driver', 'librarian', 'clinic-admin', 'finance-clerk', 'school-admin')`,
      [branchId]
    );

    // Recent transactions
    const recentResult = await pool.query(
      `SELECT * FROM finance_transactions
       WHERE branch_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [branchId]
    );

    return {
      todayCollection: parseFloat(todayResult.rows[0].total),
      monthlyRevenue: parseFloat(monthResult.rows[0].total),
      pendingApprovals: parseInt(pendingResult.rows[0].count),
      registrations: parseInt(registrationsResult.rows[0].count),
      overdueStudents: parseInt(overdueResult.rows[0].count),
      transportStudents: parseInt(transportResult.rows[0].count),
      staffCount: parseInt(staffResult.rows[0].count),
      recentTransactions: recentResult.rows
    };
  }

  // Get overdue payments - returns all students with ANY overdue month, with itemised unpaid amounts
  async getOverduePayments(branchId: string) {
    const ethNow = gregorianToEthiopian(new Date());
    const currentMonth = `${ethNow.year}-${String(ethNow.month).padStart(2, '0')}`;
    // Sync the current month so newly overdue students are flagged
    await this.syncCollectionStatusesForMonth(currentMonth, branchId);

    // 1. Fetch all overdue records for this branch
    const overdueRecs = await pool.query(
      `SELECT sc.student_id, sc.month
       FROM student_collections sc
       JOIN students s ON s.id = sc.student_id
       WHERE s.branch_id = $1 AND sc.status = 'overdue'
       ORDER BY sc.student_id, sc.month`,
      [branchId]
    );

    if (overdueRecs.rows.length === 0) return [];

    // 2. Distinct student IDs
    const studentIds: string[] = [...new Set(overdueRecs.rows.map((r: any) => r.student_id as string))];

    // 3. Student details (include created_at so penalty enrollment-date check works)
    const studentsRes = await pool.query(
      `SELECT s.id, s.grade, s.branch_id, s.is_bus_user, s.parent_phone, s.created_at, s.penalty_fee,
         COALESCE(
           NULLIF(s.monthly_fee, 0),
           (SELECT monthly_fee FROM branch_grade_fees
            WHERE branch_id = s.branch_id
              AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
            LIMIT 1),
           0
         ) AS monthly_fee,
         CASE WHEN s.is_bus_user = TRUE THEN
           COALESCE(
             NULLIF(s.bus_fee, 0),
             (SELECT bus_fee FROM branch_grade_fees
              WHERE branch_id = s.branch_id
                AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
              LIMIT 1),
             0
           )
         ELSE 0 END AS bus_fee,
         u.name, u.email, u.digital_id
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ANY($1)`,
      [studentIds]
    );

    const client = await pool.connect();
    try {
      const results: any[] = [];

      for (const student of studentsRes.rows) {
        // All overdue months for this student (sorted ascending = oldest first)
        const overdue_months: string[] = overdueRecs.rows
          .filter((r: any) => r.student_id === student.id)
          .map((r: any) => r.month as string);

        const mFee = Number(student.monthly_fee || 0);
        const bFee = Number(student.bus_fee || 0);

        let monthly_unpaid = 0;
        let bus_unpaid = 0;
        let penalty_unpaid = 0;
        let registration_unpaid = 0;

        for (const m of overdue_months) {
          // Fetch approved fee deduction from fee_deductions table for this student and month
          const dedRes = await client.query(
            `SELECT COALESCE(approved_amount, 0) as approved_amount
             FROM fee_deductions
             WHERE student_id = $1 AND month = $2 AND status = 'approved'`,
            [student.id, m]
          );
          const approvedDeduction = Number(dedRes.rows[0]?.approved_amount || 0);
          const effectiveMFee = Math.max(0, mFee - approvedDeduction);

          // Monthly (cash + aid)
          const mPaidRes = await client.query(
            `SELECT COALESCE(
               (SELECT SUM(pi.amount) FROM payments p JOIN payment_items pi ON pi.payment_id = p.id
                WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = 'monthly'), 0
             ) + COALESCE(
               (SELECT SUM(amount) FROM student_aid_usages WHERE student_id = $1 AND month = $2), 0
             ) AS paid`,
            [student.id, m]
          );
          monthly_unpaid += Math.max(0, effectiveMFee - Number(mPaidRes.rows[0].paid || 0));

          // Bus
          if (bFee > 0) {
            const bPaidRes = await client.query(
              `SELECT COALESCE(SUM(pi.amount),0) AS paid FROM payments p
               JOIN payment_items pi ON pi.payment_id = p.id
               WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = 'bus'`,
              [student.id, m]
            );
            bus_unpaid += Math.max(0, bFee - Number(bPaidRes.rows[0].paid || 0));
          }

          // Penalty
          const penaltyDue = await this.getPenaltyDueForMonth(client, student, m);
          const pPaidRes = await client.query(
            `SELECT COALESCE(SUM(pi.amount),0) AS paid FROM payments p
             JOIN payment_items pi ON pi.payment_id = p.id
             WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = 'penalty'`,
            [student.id, m]
          );
          penalty_unpaid += Math.max(0, penaltyDue - Number(pPaidRes.rows[0].paid || 0));

          // Registration (only due in enrollment month)
          const regDue = await this.getRegistrationDueForMonth(client, student.id, student.branch_id, m);
          if (regDue > 0) {
            const rPaidRes = await client.query(
              `SELECT COALESCE(SUM(pi.amount),0) AS paid FROM payments p
               JOIN payment_items pi ON pi.payment_id = p.id
               WHERE p.student_id = $1 AND p.month = $2 AND pi.fee_type = 'registration'`,
              [student.id, m]
            );
            registration_unpaid += Math.max(0, regDue - Number(rPaidRes.rows[0].paid || 0));
          }
        }

        // Only include if there is still an actual unpaid balance.
        // This guards against stale 'overdue' records in student_collections that
        // haven't been re-synced yet after the student paid.
        const total_unpaid = monthly_unpaid + bus_unpaid + penalty_unpaid + registration_unpaid;
        if (total_unpaid <= 0) {
          // Auto-clear the stale overdue records in the DB so future queries are fast
          for (const m of overdue_months) {
            await client.query(
              `UPDATE student_collections SET status = 'cleared', updated_at = NOW()
               WHERE student_id = $1 AND month = $2 AND status = 'overdue'`,
              [student.id, m]
            );
          }
          continue;
        }

        results.push({
          ...student,
          collection_status: 'overdue',
          overdue_months,           // e.g. ["2018-01","2018-02"] oldest first
          monthly_unpaid,
          bus_unpaid,
          penalty_unpaid,
          registration_unpaid,
          total_unpaid
        });
      }

      return results.sort((a: any, b: any) => a.name.localeCompare(b.name));
    } finally {
      client.release();
    }
  }


  async syncCollectionStatusesForMonth(month: string, branchId?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const params: any[] = [];
      let where = '';
      if (branchId) {
        params.push(branchId);
        where = ` AND s.branch_id = $${params.length}`;
      }

      const studentsRes = await client.query(
        `SELECT s.id, s.grade, s.branch_id, s.penalty_fee, s.is_bus_user, s.created_at,
           COALESCE(
             NULLIF(s.monthly_fee, 0),
             (
               SELECT monthly_fee FROM branch_grade_fees 
               WHERE branch_id = s.branch_id 
                 AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
               LIMIT 1
             ),
             0
           ) AS monthly_fee,
           CASE WHEN s.is_bus_user = TRUE THEN
             COALESCE(
               NULLIF(s.bus_fee, 0),
               (
                 SELECT bus_fee FROM branch_grade_fees 
                 WHERE branch_id = s.branch_id 
                   AND REPLACE(REPLACE(LOWER(grade_level), 'grade', ''), ' ', '') = REPLACE(REPLACE(LOWER(s.grade), 'grade', ''), ' ', '')
                 LIMIT 1
               ),
               0
             )
           ELSE 0 END AS bus_fee,
            s.fee_status, s.fee_approval_status, s.requested_aid_amount
          FROM students s
          WHERE 1=1 ${where}`,
        params
      );

      const deadlineDay = await this.getFinanceSettingNumber('student_payment_deadline', 10);
      const dueDate = this.getPaymentDueDateForMonth(month, deadlineDay);
      const now = new Date();
      const [, monthNumStr] = month.split('-');
      const monthNum = parseInt(monthNumStr, 10);
      const isSummerMonth = monthNum === 11 || monthNum === 12 || monthNum === 13;

      for (const student of studentsRes.rows) {
        // Rollover reset logic: if the student has fee reduction status (pending/approved/rejected)
        // but it is for a past month, reset s.fee_status, s.fee_approval_status, and s.requested_aid_amount.
        const latestDedRes = await client.query(
          `SELECT month FROM fee_deductions WHERE student_id = $1 ORDER BY month DESC LIMIT 1`,
          [student.id]
        );
        const latestDedMonth = latestDedRes.rows[0]?.month;
        if (latestDedMonth && latestDedMonth !== month && student.fee_approval_status !== 'none') {
          await client.query(
            `UPDATE students
             SET fee_status = 'standard',
                 fee_approval_status = 'none',
                 requested_aid_amount = 0,
                 updated_at = NOW()
             WHERE id = $1`,
            [student.id]
          );
          student.fee_status = 'standard';
          student.fee_approval_status = 'none';
          student.requested_aid_amount = 0;
        }

        // Skip already cleared months
        const existingRes = await client.query(
          `SELECT status FROM student_collections WHERE student_id = $1 AND month = $2`,
          [student.id, month]
        );
        if (existingRes.rows.length > 0 && existingRes.rows[0].status === 'cleared') {
          continue;
        }

        const outstandingTotal = await this.computeMonthlyFeesOutstanding(client, student, student.branch_id, month);
        let status = 'in_collections';
        if (outstandingTotal <= 0) {
          status = 'cleared';
        } else if (now > dueDate) {
          // Summer months (Hamle/Nehase/Pagume) never go overdue — they hold
          // in_collections until the one-time registration fee is paid.
          status = isSummerMonth ? 'in_collections' : 'overdue';
        }

        await client.query(
          `INSERT INTO student_collections (student_id, month, due_date, status, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (student_id, month)
           DO UPDATE SET status = EXCLUDED.status, due_date = EXCLUDED.due_date, updated_at = NOW()`,
          [student.id, month, dueDate.toISOString().slice(0, 10), status]
        );

        // If a summer month just resolved to cleared, cascade-clear the other two
        // so the one-time registration fee shows as settled across all three months.
        if (isSummerMonth && status === 'cleared') {
          const [yearStr] = month.split('-');
          const year = parseInt(yearStr, 10);
          const otherSummerMonths = ['11', '12', '13']
            .map(m => `${year}-${m}`)
            .filter(m => m !== month);
          for (const sm of otherSummerMonths) {
            const smDueDate = this.getPaymentDueDateForMonth(sm, deadlineDay);
            await client.query(
              `INSERT INTO student_collections (student_id, month, due_date, status, updated_at)
               VALUES ($1, $2, $3, 'cleared', NOW())
               ON CONFLICT (student_id, month)
               DO UPDATE SET status = 'cleared', due_date = EXCLUDED.due_date, updated_at = NOW()`,
              [student.id, sm, smDueDate.toISOString().slice(0, 10)]
            );
          }
        }

        // ── Re-evaluate ALL previously overdue months for this student ────────
        // When a student pays their current balance and becomes cleared, any stale
        // 'overdue' records from prior months should also be re-evaluated so the
        // student is fully removed from the Overdue tab.
        const existingOverdueRes = await client.query(
          `SELECT month FROM student_collections
           WHERE student_id = $1 AND status = 'overdue' AND month <> $2`,
          [student.id, month]
        );
        for (const row of existingOverdueRes.rows) {
          const om: string = row.month;
          const omOutstanding = await this.computeMonthlyFeesOutstanding(client, student, student.branch_id, om);
          const [, omNumStr] = om.split('-');
          const omNum = parseInt(omNumStr, 10);
          const omDueDate = this.getPaymentDueDateForMonth(om, deadlineDay);
          let omStatus = 'in_collections';
          if (omOutstanding <= 0) {
            omStatus = 'cleared';
          } else if (now > omDueDate) {
            omStatus = (omNum === 11 || omNum === 12 || omNum === 13) ? 'in_collections' : 'overdue';
          }
          await client.query(
            `UPDATE student_collections SET status = $1, updated_at = NOW()
             WHERE student_id = $2 AND month = $3`,
            [omStatus, student.id, om]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get daily collection report
  async getDailyReport(branchId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        ft.*,
        COUNT(*) OVER() as total_transactions,
        SUM(amount) OVER() as total_amount
      FROM finance_transactions ft
      WHERE branch_id = $1 AND date = $2
      ORDER BY created_at DESC`,
      [branchId, targetDate]
    );

    return {
      date: targetDate,
      transactions: result.rows,
      summary: {
        totalTransactions: result.rows.length > 0 ? parseInt(result.rows[0].total_transactions) : 0,
        totalAmount: result.rows.length > 0 ? parseFloat(result.rows[0].total_amount) : 0
      }
    };
  }

  // Applications for finance
  async getPendingApplications(branchId: string, status?: string) {
    return await schoolAdminService.getApplicationsForFinance(branchId, status);
  }

  // Approve an application (delegate to schoolAdminService; fee is always resolved server-side)
  async approveApplication(
    applicationId: string,
    payment: { amount?: number; reference?: string; parentDigitalId?: string },
    financeUserId: string
  ) {
    const appRes = await pool.query(
      `SELECT branch_id, grade_applying, applicant_name FROM pending_applications WHERE id = $1`,
      [applicationId]
    );
    if (appRes.rows.length === 0) {
      throw new Error('Application not found');
    }

    const app = appRes.rows[0];
    const resolved = await this.resolveRegistrationFee(app.branch_id, app.grade_applying);

    if (resolved.amount <= 0) {
      throw new Error(
        'Registration fee is not configured in system settings. Please contact the administrator.'
      );
    }

    const result = await schoolAdminService.financeApproveApplication(
      applicationId,
      { amount: resolved.amount, reference: payment.reference, parentDigitalId: payment.parentDigitalId },
      financeUserId
    );

    const studentId = result.student?.id;
    if (studentId) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const paymentDateGregorian = new Date().toISOString().slice(0, 10);
        const ethDate = gregorianToEthiopic(new Date());
        const currentMonth = `${ethDate.year}-${String(ethDate.month).padStart(2, '0')}`;

        // Insert into payments
        const paymentRes = await client.query(
          `INSERT INTO payments (student_id, payer_id, branch_id, month, date, total_amount, reference)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [studentId, null, app.branch_id, currentMonth, paymentDateGregorian, resolved.amount, payment.reference || null]
        );

        const paymentId = paymentRes.rows[0].id;

        // Insert into payment_items
        await client.query(
          `INSERT INTO payment_items (payment_id, fee_type, amount) VALUES ($1, $2, $3)`,
          [paymentId, 'registration', resolved.amount]
        );

        // Fetch user name for finance_transactions
        const userRes = await client.query(`SELECT name FROM users WHERE id = $1`, [financeUserId]);
        const verifiedBy = userRes.rows[0]?.name || 'Finance Clerk';

        // Insert into finance_transactions
        await client.query(
          `INSERT INTO finance_transactions (student_id, student_name, amount, type, date, verified_by, branch_id, ethiopic_month, ethiopic_year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [studentId, app.applicant_name, resolved.amount, 'Registration Fee', paymentDateGregorian, verifiedBy, app.branch_id, ethDate.month, ethDate.year]
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error recording registration payment:', err);
      } finally {
        client.release();
      }
    }

    return result;
  }

  // Reject an application: return it to school admin with a reason (do not delete)
  async rejectApplication(applicationId: string, financeUserId: string, reason?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `UPDATE pending_applications
         SET status = $1,
             finance_removal_reason = $2,
             finance_removed_by = $3,
             finance_removed_at = NOW(),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        ['pending', reason || null, financeUserId, applicationId]
      );

      if (res.rows.length === 0) {
        throw new Error('Application not found');
      }

      await client.query('COMMIT');
      return res.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Get student info and parent phone for SMS sending
  async getStudentParentPhone(studentId: string, branchId?: string) {
    const query = `
      SELECT 
        s.id,
        s.parent_phone,
        u.name as student_name,
        u.digital_id,
        s.grade,
        s.branch_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `;

    const params: any[] = [studentId];

    if (branchId) {
      // Verify the student belongs to the requesting finance clerk's branch
      const branchCheckRes = await pool.query(query + ' AND s.branch_id = $2', [...params, branchId]);
      if (branchCheckRes.rows.length === 0) {
        throw new Error('Student not found or does not belong to your branch');
      }
      return branchCheckRes.rows[0];
    }

    const res = await pool.query(query, params);
    if (res.rows.length === 0) {
      throw new Error('Student not found');
    }
    return res.rows[0];
  }

  // Send SMS to parent about overdue payments
  async sendSmsToParent(studentId: string, message: string, branchId?: string) {
    // 1. Get student and parent phone
    const student = await this.getStudentParentPhone(studentId, branchId);

    if (!student.parent_phone || !student.parent_phone.trim()) {
      throw new Error('Parent phone number not found for this student');
    }

    // 2. Validate phone format (Ethiopian phone numbers typically start with +251 or 0)
    const phone = student.parent_phone.trim();
    const phoneRegex = /^(\+?251|0)[0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error(`Invalid phone number format: ${phone}`);
    }

    // 3. Validate message length
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 160) {
      throw new Error('Message cannot exceed 160 characters');
    }

    // 4. Send SMS via SMS service
    const { smsService } = require('./sms.service');
    const sent = await smsService.sendSMS(phone, message);

    if (!sent) {
      throw new Error('Failed to send SMS. Modem may be unavailable.');
    }

    // 5. Log the SMS attempt (optional - for audit trail)
    try {
      await pool.query(
        `INSERT INTO sms_logs (student_id, parent_phone, message, status, sent_at, branch_id)
         VALUES ($1, $2, $3, $4, NOW(), $5)`,
        [studentId, phone, message, 'sent', branchId || null]
      );
    } catch (logErr) {
      console.warn('[FinanceClerk SMS] Could not log SMS attempt:', logErr);
      // Don't throw - SMS was sent, just couldn't log it
    }

    return {
      success: true,
      studentId,
      studentName: student.student_name,
      phone,
      message,
      sentAt: new Date().toISOString()
    };
  }
}

export default new FinanceClerkService();