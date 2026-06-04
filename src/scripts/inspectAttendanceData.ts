import pool from '../config/database';

async function main() {
  const r1 = await pool.query(`SELECT DISTINCT status FROM employee_attendance`);
  console.log('Employee attendance statuses:', r1.rows);

  const r2 = await pool.query(`SELECT DISTINCT status FROM student_attendance`);
  console.log('Student attendance statuses:', r2.rows);

  const r3 = await pool.query(`SELECT MAX(date) FROM employee_attendance`);
  console.log('Max date employee:', r3.rows);

  const r4 = await pool.query(`SELECT MAX(date) FROM student_attendance`);
  console.log('Max date student:', r4.rows);

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });