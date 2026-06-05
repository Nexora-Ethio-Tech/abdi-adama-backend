import pool from './config/database';

async function main() {
  try {
    const collections = await pool.query('SELECT month, COUNT(*) FROM student_collections GROUP BY month LIMIT 10');
    console.log('--- Student Collections Months ---');
    console.log(collections.rows);

    const payments = await pool.query('SELECT month, COUNT(*) FROM payments GROUP BY month LIMIT 10');
    console.log('--- Payments Months ---');
    console.log(payments.rows);

    const firstStudent = await pool.query('SELECT created_at, grade FROM students LIMIT 1');
    console.log('--- Student Sample ---');
    console.log(firstStudent.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
