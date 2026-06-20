import pool from '../config/database';

async function main() {
  try {
    const res = await pool.query(`
      SELECT 
        conname, 
        pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'public.employee_attendance'::regclass;
    `);
    console.log('--- employee_attendance constraints ---');
    console.log(JSON.stringify(res.rows, null, 2));

    const columnsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'employee_attendance';
    `);
    console.log('--- employee_attendance columns ---');
    console.log(JSON.stringify(columnsRes.rows, null, 2));

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await pool.end();
  }
}

main();
