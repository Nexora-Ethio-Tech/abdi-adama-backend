import logger from './logger';

/**
 * Stub email service for logging and future integration with a real provider (e.g. Nodemailer, AWS SES, SendGrid).
 */
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
  logger.info(`[EMAIL SERVICE] Sending Email to ${to}`);
  logger.info(`[EMAIL SERVICE] Subject: ${subject}`);
  logger.info(`[EMAIL SERVICE] Body snippet:\n${htmlBody}`);
  
  // Real implementation stub:
  // try {
  //   const transporter = nodemailer.createTransport({...});
  //   await transporter.sendMail({ from, to, subject, html: htmlBody });
  //   return true;
  // } catch (e) {
  //   logger.error('Failed to send email:', e);
  //   return false;
  // }
  
  return true;
}

/**
 * Sends a welcome email to a newly created user with their login credentials.
 */
export async function sendWelcomeEmail(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<boolean> {
  const subject = 'Welcome to Abdi Adama School IMS – Your Account is Ready';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
        Welcome to Abdi Adama School IMS 🎉
      </h2>

      <p>Dear <strong>${name}</strong>,</p>
      <p>
        Your account has been created by the Super Admin. You can now log in to the
        School Information Management System using the credentials below.
      </p>

      <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Role</th>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${role}</td>
        </tr>
        <tr>
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
        <li>Go to the School IMS login page.</li>
        <li>Enter your email: <strong>${email}</strong></li>
        <li>Enter your temporary password shown above.</li>
        <li>You will be prompted to set a new password on first login.</li>
      </ol>

      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated message. If you did not expect this account or believe
        this is an error, please contact your Super Admin immediately.
      </div>
    </div>
  `;

  return sendEmail(email, subject, htmlBody);
}

/**
 * Sends a formatted loan notification email to an employee.
 */
export async function sendLoanNotification(
  employeeName: string,
  email: string,
  amount: number,
  monthlyDeduction: number,
  maxMonths: number
): Promise<boolean> {
  const subject = 'Loan Issued successfully - Abdi Adama School IMS';
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Loan Agreement Information</h2>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>This is to inform you that a loan has been successfully issued to you in the School Management Information System (IMS).</p>
      
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
      
      <p>The monthly repayment amount will be automatically deducted from your basic salary starting from the next payroll cycle until the loan is fully repaid.</p>
      <p>You can view your real-time outstanding balance, payment history, and salary slips at any time in your staff dashboard under the **My Finance** tab.</p>
      
      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated system notification. If you did not request this loan or believe there is an error, please contact the Finance Department immediately.
      </div>
    </div>
  `;

  return sendEmail(email, subject, htmlBody);
}

/**
 * Sends a formatted payroll notification email to an employee when payroll is finalized.
 */
export async function sendPayrollNotification(
  employeeName: string,
  email: string,
  month: string,
  year: number,
  netPay: number
): Promise<boolean> {
  const subject = `Payslip Available for ${month} ${year} - Abdi Adama School IMS`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Payslip Published</h2>
      <p>Dear <strong>${employeeName}</strong>,</p>
      <p>Your payslip for the month of <strong>${month} ${year}</strong> has been processed and finalized by the Finance Department.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center;">
        <span style="font-size: 14px; color: #166534; display: block; margin-bottom: 5px;">Net Salary Pay</span>
        <strong style="font-size: 24px; color: #15803d;">${netPay} ETB</strong>
      </div>
      
      <p>A full breakdown of your basic salary, allowances, overtime, absent deductions, loan repayments, pension, and income tax is now available.</p>
      <p>Please log in to your **Staff Portal** and go to the **My Finance** page to view and download your full payslip.</p>
      
      <div style="margin-top: 30px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px;">
        This is an automated system notification. For any inquiries regarding your salary slip calculations, please contact your branch finance clerk.
      </div>
    </div>
  `;

  return sendEmail(email, subject, htmlBody);
}