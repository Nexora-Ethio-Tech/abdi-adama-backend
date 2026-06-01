import pool from '../config/database';

async function run() {
  try {
    console.log("=== INSPECTING CLASS_TEACHERS ===");
    const res = await pool.query(`
      SELECT * FROM class_teachers
    `);
    console.log(`Total records: ${res.rows.length}`);
    res.rows.forEach((r, idx) => {
      console.log(`${idx + 1}.`, r);
    });

    console.log("\n=== COLUMNS IN CLASS_TEACHERS ===");
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'class_teachers'
    `);
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
