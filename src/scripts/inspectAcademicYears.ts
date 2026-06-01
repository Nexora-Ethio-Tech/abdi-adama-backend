import pool from '../config/database';

async function main() {
  try {
    const res = await pool.query('SELECT * FROM academic_years');
    console.log("Academic Years in DB:");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err: any) {
    console.error("Error:", err);
    process.exit(1);
  }
}
main();
