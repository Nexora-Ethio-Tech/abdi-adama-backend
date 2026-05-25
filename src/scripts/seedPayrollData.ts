import dotenv from 'dotenv';
import pool from '../config/database';
import { hashPassword } from '../utils/password';

dotenv.config();

async function main() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting Payroll and Loan database seeding...');
    await client.query('BEGIN');

    // 1. Fetch branch ID (Main Branch)
    const branchRes = await client.query("SELECT id FROM branches WHERE name = 'Main Branch' LIMIT 1");
    if (branchRes.rows.length === 0) {
      throw new Error("Main Branch not found in database. Please run superadmin/demo seeding first.");
    }
    const branchId = branchRes.rows[0].id;
    console.log(`Using branch ID: ${branchId}`);

    // 2. Fetch Super Admin ID
    const superAdminRes = await client.query("SELECT id FROM users WHERE email = 'abdiadamaschooloffice@gmail.com' LIMIT 1");
    if (superAdminRes.rows.length === 0) {
      throw new Error("Super Admin user not found. Please run superadmin seeding first.");
    }
    const superAdminId = superAdminRes.rows[0].id;
    console.log(`Using Super Admin ID: ${superAdminId}`);

    // 3. Ensure a Finance Clerk exists
    const financeClerkEmail = 'finance@test.com';
    const financeClerkRes = await client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [financeClerkEmail]);
    let financeClerkId;
    if (financeClerkRes.rows.length === 0) {
      const passwordHash = await hashPassword('Finance@2026');
      const insertClerkRes = await client.query(
        `INSERT INTO users (digital_id, username, name, email, password_hash, role, branch_id, status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        ['FIN-MB-001', 'financeclerk', 'Finance Clerk', financeClerkEmail, passwordHash, 'finance-clerk', branchId, 'Approved', true]
      );
      financeClerkId = insertClerkRes.rows[0].id;
      console.log(`✅ Created Finance Clerk user: ${financeClerkEmail} (Password: Finance@2026)`);
    } else {
      financeClerkId = financeClerkRes.rows[0].id;
      console.log(`✅ Finance Clerk user already exists: ${financeClerkEmail}`);
    }

    // 4. Clean up previous payroll/loan test data
    console.log('Clearing old payroll runs, items, loans, repayments, attendance, and profiles...');
    await client.query("DELETE FROM loan_repayments");
    await client.query("DELETE FROM payroll_items");
    await client.query("DELETE FROM payroll_runs");
    await client.query("DELETE FROM loans");
    await client.query("DELETE FROM employee_attendance");
    await client.query("DELETE FROM employee_payroll_profiles");

    // 5. Seed Employee Payroll Profiles
    const profilesToSeed = [
      {
        email: 'dean@test.com',
        basic: 15000.0,
        transport: 1200.0,
        housing: 2000.0,
        position: 1000.0,
        overtime: 150.0,
        bank: 'CBE-1000234567890',
        tin: '123456789'
      },
      {
        email: 'teacher2@test.com',
        basic: 12000.0,
        transport: 1000.0,
        housing: 1500.0,
        position: 0.0,
        overtime: 120.0,
        bank: 'Abyssinia-987654321',
        tin: '987654321'
      },
      {
        email: 'driver1@example.com',
        basic: 8000.0,
        transport: 1500.0,
        housing: 1000.0,
        position: 0.0,
        overtime: 80.0,
        bank: 'Awash-5555444433',
        tin: '555544443'
      },
      {
        email: 'clinic1@example.com',
        basic: 10000.0,
        transport: 1000.0,
        housing: 1200.0,
        position: 500.0,
        overtime: 100.0,
        bank: 'Dashen-1122334455',
        tin: '112233445'
      }
    ];

    for (const p of profilesToSeed) {
      const userRes = await client.query("SELECT id, name FROM users WHERE email = $1 LIMIT 1", [p.email]);
      if (userRes.rows.length === 0) {
        console.warn(`⚠️ User with email ${p.email} not found in database. Skipping.`);
        continue;
      }
      const userId = userRes.rows[0].id;
      const userName = userRes.rows[0].name;

      await client.query(
        `INSERT INTO employee_payroll_profiles 
          (user_id, basic_salary, transport_allowance, housing_allowance, position_allowance, overtime_rate_per_hour, bank_account, tin_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, p.basic, p.transport, p.housing, p.position, p.overtime, p.bank, p.tin]
      );
      console.log(`✅ Seeded payroll profile for ${userName} (${p.email})`);
    }

    // 6. Seed Employee Attendance for May 2026
    const attendanceRecords = [
      { email: 'dean@test.com', absentDates: ['2026-05-12', '2026-05-13'] }, // 2 days absent
      { email: 'teacher2@test.com', absentDates: [] },                        // 0 days absent
      { email: 'driver1@example.com', absentDates: ['2026-05-15'] },          // 1 day absent
      { email: 'clinic1@example.com', absentDates: [] }                       // 0 days absent
    ];

    console.log('Seeding daily attendance for May 2026 (May 1st to May 24th)...');
    for (const record of attendanceRecords) {
      const userRes = await client.query("SELECT id, name FROM users WHERE email = $1 LIMIT 1", [record.email]);
      if (userRes.rows.length === 0) continue;
      const userId = userRes.rows[0].id;
      const userName = userRes.rows[0].name;

      for (let day = 1; day <= 24; day++) {
        const dateStr = `2026-05-${String(day).padStart(2, '0')}`;
        const isAbsent = record.absentDates.includes(dateStr);
        const status = isAbsent ? 'absent' : 'present';

        await client.query(
          `INSERT INTO employee_attendance (user_id, date, status, recorded_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, date) DO UPDATE SET status = $3`,
          [userId, dateStr, status, superAdminId]
        );
      }
      console.log(`✅ Seeded attendance for ${userName} (${record.email}) - Absent days: ${record.absentDates.length > 0 ? record.absentDates.join(', ') : 'None'}`);
    }

    // 7. Seed active loan for Teacher Two
    const teacherTwoRes = await client.query("SELECT id, name FROM users WHERE email = 'teacher2@test.com' LIMIT 1");
    if (teacherTwoRes.rows.length > 0) {
      const teacherTwoId = teacherTwoRes.rows[0].id;
      const teacherTwoName = teacherTwoRes.rows[0].name;

      // Basic Salary is 12000. With 30% loan deduction percentage, monthly deduction is 3600 ETB.
      await client.query(
        `INSERT INTO loans (employee_id, amount, remaining_balance, monthly_deduction, max_months, status, issued_by, notes)
         VALUES ($1, 6000.0, 6000.0, 3600.0, 3, 'active', $2, 'Computer purchase loan')`,
        [teacherTwoId, superAdminId]
      );
      console.log(`✅ Seeded active loan of 6000 ETB for ${teacherTwoName} (teacher2@test.com)`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 Seeding of Payroll and Loan data completed successfully!');
    console.log('---------------------------------------------------------');
    console.log('Login credentials for testing:');
    console.log(`  - Finance Clerk: ${financeClerkEmail} / Finance@2026`);
    console.log(`  - Teacher One (with 2 absences): dean@test.com / (existing password)`);
    console.log(`  - Teacher Two (with active loan): teacher2@test.com / (existing password)`);
    console.log('---------------------------------------------------------');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
