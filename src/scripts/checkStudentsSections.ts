import pool from '../config/db';

async function main() {
  try {
    const res = await pool.query(`
      SELECT s.id, u.name, s.grade, s.section_id, c.name as class_name, c.section as class_section
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.section_id = c.id
      LIMIT 10
    `);
    console.log('\n=== Students and their class sections ===');
    res.rows.forEach((r: any) => console.log(`  Student: ${r.name}, Grade: ${r.grade}, section_id: ${r.section_id}, Class: ${r.class_name} (${r.class_section})`));
  } catch (err: any) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
