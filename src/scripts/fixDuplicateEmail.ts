import pool from '../config/database';

async function run() {
  try {
    // Show the conflict clearly
    const r = await pool.query(
      `SELECT id, digital_id, name, email, role, status
       FROM users
       WHERE email = 'abdiadamaschooloffice@gmail.com'
       ORDER BY role`
    );
    console.log('Users sharing the same email:');
    console.log(JSON.stringify(r.rows, null, 2));

    // Fix: update the vice-principal's email to a unique one so login isn't ambiguous
    const vpRow = r.rows.find((u: any) => u.role === 'vice-principal');
    if (vpRow) {
      const newEmail = `vp.kassahun.lemma@abdiadama.edu`;
      await pool.query(
        `UPDATE users SET email = $1 WHERE id = $2`,
        [newEmail, vpRow.id]
      );
      console.log(`\n✅ Updated VP (${vpRow.name}) email from "${vpRow.email}" → "${newEmail}"`);
      console.log('   Super-admin login with abdiadamaschooloffice@gmail.com will now work correctly.');
    } else {
      console.log('No vice-principal found with that email — no fix needed.');
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
