import pool from '../config/database';

async function run() {
  try {
    // Check teacher_ratings table
    const ratingsTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_ratings' 
      ORDER BY column_name
    `);

    if (ratingsTable.rows.length === 0) {
      console.log('❌ teacher_ratings TABLE DOES NOT EXIST');
    } else {
      console.log('✅ teacher_ratings columns:');
      ratingsTable.rows.forEach((r: any) => console.log(`  ${r.column_name}: ${r.data_type}`));
    }

    // Check weekly_plans columns
    const plansTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'weekly_plans' 
        AND column_name IN ('dean_rating','dean_feedback','dept_head_id','reviewed_by','status')
      ORDER BY column_name
    `);
    console.log('\n✅ weekly_plans relevant columns:');
    plansTable.rows.forEach((r: any) => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check if any department heads exist
    const deans = await pool.query(`
      SELECT u.name, u.digital_id, t.department, t.is_dean 
      FROM teachers t 
      JOIN users u ON t.user_id = u.id 
      WHERE t.is_dean = true
      LIMIT 5
    `);
    console.log(`\n✅ Department Heads in DB: ${deans.rows.length}`);
    deans.rows.forEach((r: any) => console.log(`  ${r.name} (${r.digital_id}) — dept: ${r.department}`));

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
