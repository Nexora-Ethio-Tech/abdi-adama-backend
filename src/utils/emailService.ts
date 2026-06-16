import nodemailer from 'nodemailer';
import logger from './logger';

// ─── Singleton transporter ────────────────────────────────────────────────────
// Created once at module load time so we don't pay the setup cost on every send.
let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for port 465, false for 587
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return _transporter;
}

/**
 * Clears the cached transporter so the next send picks up updated env vars.
 * Called by superAdminService.updateSmtpSettings() after saving new credentials.
 */
export function resetTransporter(): void {
  _transporter = null;
  logger.info('[EMAIL] Transporter reset — next send will use updated SMTP config');
}

// The "from" address: prefer SMTP_FROM, fall back to SMTP_USER so the env
// variable is optional and emails never go out with "from: <undefined>".
const getSenderAddress = () => {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || '';
  const displayName = fromEmail.toLowerCase().includes('abdiadamaschooloffice')
    ? 'Abdi Adama School Office'
    : 'Abdi Adama School IMS';
  return `"${displayName}" <${fromEmail}>`;
};

// ─── Core send helper ─────────────────────────────────────────────────────────

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<boolean> {
  try {
    // Generate a clean plain-text fallback by stripping HTML tags
    const plainTextFallback = textBody || htmlBody
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    await getTransporter().sendMail({
      from: getSenderAddress(),
      to,
      subject,
      html: htmlBody,
      text: plainTextFallback,
    });
    logger.info(`[EMAIL] Sent "${subject}" → ${to}`);
    return true;
  } catch (error) {
    logger.error(`[EMAIL] Failed to send "${subject}" → ${to}:`, error);
    return false;
  }
}

// ─── Welcome email ────────────────────────────────────────────────────────────

/**
 * Sends a welcome email to a newly created user with their login credentials.
 * Works for both admin roles (complex password) and operational roles (4-digit PIN).
 */
export async function sendWelcomeEmail(
  name: string,
  email: string,
  password: string,
  role: string,
  digitalId?: string
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://abdi-adama.com';
  const subject = 'Welcome to Abdi Adama School IMS – Your Account is Ready';

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
        Welcome to Abdi Adama School IMS 🎉
      </h2>

      <p>Dear <strong>${name}</strong>,</p>
      <p>Your account has been created by the Super Administrator. You can now log in using the credentials below.</p>

      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Role</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${role}</td>
        </tr>
        ${digitalId ? `
        <tr>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Digital ID</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #4f46e5;">${digitalId}</td>
        </tr>` : ''}
        <tr${digitalId ? '' : ' style="background-color: #f8fafc;"'}>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Email</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${email}</td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Temporary Password</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">
            <strong style="color: #dc2626; font-size: 16px; letter-spacing: 1px;">${password}</strong>
          </td>
        </tr>
      </table>

      <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong style="color: #92400e;">⚠️ Important:</strong>
        <p style="margin: 8px 0 0; color: #78350f;">
          For your security, please log in and change your password immediately.
          Do not share your credentials with anyone.
        </p>
      </div>

      <h3 style="color: #4f46e5;">How to Log In</h3>
      <ol style="line-height: 1.8; color: #475569;">
        <li>Go to the <a href="${frontendUrl}/login" style="color: #4f46e5;">School IMS login page</a>.</li>
        <li>Enter your email: <strong>${email}</strong></li>
        <li>Enter your temporary password shown above.</li>
        <li>You will be prompted to set a new password on first login.</li>
      </ol>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated message from Abdi Adama School IMS. If you did not expect this account or believe
        this is an error, please contact your administrator immediately.
      </div>
    </div>
  `;

  return sendEmail(email, subject, htmlBody);
}

// ─── Loan notification ────────────────────────────────────────────────────────

/**
 * Sent when a loan request is SUBMITTED (pending auditor review).
 * Subject and body reflect the pending state — not "issued successfully".
 */
export async function sendLoanSubmittedEmail(
  employeeName: string,
  email: string,
  amount: number,
  monthlyDeduction: number,
  maxMonths: number
): Promise<boolean> {
  const subject = 'Loan Request Submitted – Abdi Adama School IMS';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Loan Request Submitted</h2>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Your loan request has been submitted and is <strong>pending auditor approval</strong>. You will receive another notification once it is reviewed.</p>

      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Requested Amount</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${amount} ETB</strong></td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Proposed Monthly Deduction</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626;"><strong>${monthlyDeduction} ETB</strong></td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Maximum Duration</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${maxMonths} Months</strong></td>
        </tr>
      </table>

      <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong style="color: #92400e;">⏳ Status: Pending Auditor Review</strong>
        <p style="margin: 8px 0 0; color: #78350f;">
          No deductions will begin until the loan is approved and paid out by Finance.
        </p>
      </div>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated system notification. If you did not request this loan, please contact the Finance Department immediately.
      </div>
    </div>
  `;
  return sendEmail(email, subject, htmlBody);
}

/**
 * Sent when a loan is APPROVED by the auditor and paid out by Finance (status → active).
 */
export async function sendLoanApprovedEmail(
  employeeName: string,
  email: string,
  amount: number,
  monthlyDeduction: number,
  maxMonths: number
): Promise<boolean> {
  const subject = 'Loan Approved & Disbursed – Abdi Adama School IMS';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Loan Approved &amp; Disbursed</h2>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Your loan has been approved by the auditor and the funds have been disbursed by Finance. Monthly deductions will begin on your next payroll cycle.</p>

      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Loan Amount</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${amount} ETB</strong></td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Monthly Repayment Deduction</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626;"><strong>${monthlyDeduction} ETB</strong></td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Maximum Duration</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${maxMonths} Months</strong></td>
        </tr>
      </table>

      <p>You can view your outstanding balance, payment history, and salary slips at any time in your staff dashboard under the <strong>My Finance</strong> tab.</p>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated system notification. For any inquiries, please contact the Finance Department.
      </div>
    </div>
  `;
  return sendEmail(email, subject, htmlBody);
}

/**
 * Sent when the AUDITOR approves the loan (status → approved, awaiting Finance disbursement).
 */
export async function sendLoanAuditorApprovedEmail(
  employeeName: string,
  email: string,
  amount: number,
  monthlyDeduction: number,
  maxMonths: number
): Promise<boolean> {
  const subject = 'Loan Request Approved by Auditor – Abdi Adama School IMS';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #16a34a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">✅ Loan Request Approved</h2>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Great news! Your loan request has been <strong>reviewed and approved by the Auditor</strong>. The Finance Department will now process the disbursement.</p>

      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Approved Amount</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong style="color: #16a34a;">${amount.toFixed(2)} ETB</strong></td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Monthly Deduction</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0; color: #dc2626;"><strong>${monthlyDeduction.toFixed(2)} ETB / month</strong></td>
        </tr>
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Repayment Period</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>Up to ${maxMonths} months</strong></td>
        </tr>
      </table>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong style="color: #166534;">⏳ Next Step: Finance Disbursement</strong>
        <p style="margin: 8px 0 0; color: #166534;">
          Your loan has been approved and is now awaiting final payment by the Finance Department.
          You will receive another email confirmation once the funds have been disbursed and deductions are active.
        </p>
      </div>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated system notification from Abdi Adama School IMS. For any inquiries, please contact the Finance Department.
      </div>
    </div>
  `;
  return sendEmail(email, subject, htmlBody);
}

/**
 * Sent when the AUDITOR rejects the loan request (status → rejected).
 */
export async function sendLoanRejectedEmail(
  employeeName: string,
  email: string,
  amount: number,
  reason?: string
): Promise<boolean> {
  const subject = 'Loan Request Not Approved – Abdi Adama School IMS';
  const displayReason = reason && reason.trim() && reason.toLowerCase() !== 'rejected by auditor'
    ? reason.trim()
    : 'financial constraints at this time';

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #dc2626; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">❌ Loan Request Not Approved</h2>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>We regret to inform you that your loan request of <strong>${amount.toFixed(2)} ETB</strong> could not be approved at this time.</p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong style="color: #991b1b;">Reason:</strong>
        <p style="margin: 8px 0 0; color: #7f1d1d;">
          Sorry, we cannot grant your loan request at this time due to ${displayReason}.
        </p>
      </div>

      <p style="color: #475569;">
        If you believe this decision was made in error or you would like to submit a new request in the future,
        please contact your Finance Department or Branch Administrator.
      </p>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated system notification from Abdi Adama School IMS.
      </div>
    </div>
  `;
  return sendEmail(email, subject, htmlBody);
}

/**
 * Sent when an active loan is CANCELLED/voided by Finance.
 */
export async function sendLoanCancelledEmail(
  employeeName: string,
  email: string,
  amount: number
): Promise<boolean> {
  const subject = 'Loan Cancelled – Abdi Adama School IMS';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #92400e; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">⚠️ Loan Cancelled</h2>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Please be informed that your active loan of <strong>${amount.toFixed(2)} ETB</strong> has been <strong>cancelled and voided</strong> by the Finance Department.</p>

      <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong style="color: #92400e;">What this means:</strong>
        <ul style="margin: 8px 0 0; color: #78350f; padding-left: 20px; line-height: 1.8;">
          <li>No further monthly deductions will be applied to your salary.</li>
          <li>Any previously deducted amounts remain as recorded.</li>
          <li>You may be eligible to apply for a new loan in the future.</li>
        </ul>
      </div>

      <p style="color: #475569;">
        If you have questions about this cancellation, please contact your Finance Department or Branch Administrator.
      </p>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated system notification from Abdi Adama School IMS.
      </div>
    </div>
  `;
  return sendEmail(email, subject, htmlBody);
}

// Keep the old export name as an alias so any other callers don't break.
// Points to the "submitted" variant since that was the original call site.
export const sendLoanNotification = sendLoanSubmittedEmail;

// ─── Payroll notification ─────────────────────────────────────────────────────

/**
 * Sent to every employee when a payroll run is finalized.
 */
export async function sendPayrollNotification(
  employeeName: string,
  email: string,
  month: string,
  year: number,
  netPay: number
): Promise<boolean> {
  const subject = `Payslip Available for ${month} ${year} – Abdi Adama School IMS`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Payslip Published</h2>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Your payslip for <strong>${month} ${year}</strong> has been processed and finalized by the Finance Department.</p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center;">
        <span style="font-size: 14px; color: #166534; display: block; margin-bottom: 5px;">Net Salary Pay</span>
        <strong style="font-size: 24px; color: #15803d;">${netPay.toFixed(2)} ETB</strong>
      </div>

      <p>A full breakdown of your basic salary, allowances, overtime, absent deductions, loan repayments, pension, and income tax is now available.</p>
      <p>Please log in to your <strong>Staff Portal</strong> and go to the <strong>My Finance</strong> page to view and download your full payslip.</p>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated system notification. For any inquiries regarding your salary calculations, please contact your branch finance clerk.
      </div>
    </div>
  `;
  return sendEmail(email, subject, htmlBody);
}

// ─── Admission credentials email ──────────────────────────────────────────────

/**
 * Sent to a student (or parent) when their account is created during admission approval.
 * Clearly shows the login email AND the temporary PIN/password.
 */
export async function sendAdmissionCredentialsEmail(
  recipientName: string,
  recipientEmail: string,
  role: 'student' | 'parent',
  loginEmail: string,
  temporaryPassword: string,
  studentName: string,
  grade: string
): Promise<boolean> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://abdi-adama.com';
  const roleLabel = role === 'student' ? 'Student' : 'Parent / Guardian';
  const subject = `Your ${roleLabel} Account – Abdi Adama School IMS`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
        Welcome to Abdi Adama School IMS 🎉
      </h2>

      <p>Dear <strong>${recipientName}</strong>,</p>
      <p>
        The admission process for <strong>${studentName}</strong> (Grade: <strong>${grade}</strong>) has been completed.
        Your <strong>${roleLabel}</strong> account is now active.
      </p>

      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Login Email</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${loginEmail}</td>
        </tr>
        <tr>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Temporary Password / PIN</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">
            <strong style="color: #dc2626; font-size: 16px; letter-spacing: 2px;">${temporaryPassword}</strong>
          </td>
        </tr>
      </table>

      <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 6px; padding: 15px; margin: 20px 0;">
        <strong style="color: #92400e;">⚠️ Important:</strong>
        <p style="margin: 8px 0 0; color: #78350f;">
          Please log in and change your password immediately. Do not share your credentials with anyone.
        </p>
      </div>

      <p>
        <a href="${frontendUrl}/login" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Log In Now
        </a>
      </p>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated message. If you believe this is an error, please contact the school administration immediately.
      </div>
    </div>
  `;

  return sendEmail(recipientEmail, subject, htmlBody);
}
