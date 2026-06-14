import pool from './config/db';

async function main() {
  const tables = ['academic_years', 'academic_sections', 'academic_history', 'academic_history_courses', 'academic_grades'];
  for (const t of tables) {
    try {
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [t]);
      console.log(`--- ${t.toUpperCase()} COLUMNS ---`);
      console.log(cols.rows.map(r => `${r.column_name}: ${r.data_type}`));
    } catch (e) {
      console.error(`Error inspecting table ${t}:`, e);
    }
  }
  process.exit(0);
}

main();
