import pool from '../config/database';

async function run() {
  try {
    // Promote "Bekele Tesfaye" (TCH-MB-0005) as Department Head of Mathematics
    // and assign "Alemu Asfa" (TCH-MB-0007) to Mathematics department too
    const bekeleResult = await pool.query(`
      UPDATE teachers t
      SET is_dean = true, department = 'Mathematics'
      FROM users u
      WHERE t.user_id = u.id AND u.digital_id = 'TCH-MB-0005'
      RETURNING t.id, u.name
    `);

    if (bekeleResult.rows.length > 0) {
      console.log(`✅ Promoted to Department Head: ${bekeleResult.rows[0].name}`);
    }

    // Assign Alemu Asfa to Mathematics so his plans route to Bekele
    const alemuResult = await pool.query(`
      UPDATE teachers t
      SET department = 'Mathematics'
      FROM users u
      WHERE t.user_id = u.id AND u.digital_id = 'TCH-MB-0007'
      RETURNING t.id, u.name
    `);

    if (alemuResult.rows.length > 0) {
      console.log(`✅ Assigned to Mathematics department: ${alemuResult.rows[0].name}`);
    }

    // Verify
    const verify = await pool.query(`
      SELECT u.name, u.digital_id, t.department, t.is_dean
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE u.digital_id IN ('TCH-MB-0005', 'TCH-MB-0007')
    `);
    console.log('\n📋 Verification:');
    verify.rows.forEach((r: any) =>
      console.log(`  [${r.digital_id}] ${r.name} | dept: ${r.department} | is_dean: ${r.is_dean}`)
    );

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
