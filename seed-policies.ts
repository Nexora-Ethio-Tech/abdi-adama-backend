import pool from './src/config/database';

(async () => {
  try {
    console.log('🌱 Seeding financial policies...\n');

    // Get Main Branch ID
    const branchRes = await pool.query(
      "SELECT id, name FROM branches WHERE name = 'Main Branch' LIMIT 1"
    );
    const mainBranchId = branchRes.rows[0]?.id;
    if (!mainBranchId) {
      throw new Error('Main Branch not found!');
    }
    console.log('✅ Main Branch ID:', mainBranchId);

    // Define grade policies
    const grades = [
      { level: 'Grade 1', tuition: 3500, reg: 1500, bus: 1000 },
      { level: 'Grade 2', tuition: 3500, reg: 1500, bus: 1000 },
      { level: 'Grade 3', tuition: 3500, reg: 1500, bus: 1000 },
      { level: 'Grade 4', tuition: 4000, reg: 1500, bus: 1000 },
      { level: 'Grade 5', tuition: 4000, reg: 1500, bus: 1000 },
      { level: 'Grade 6', tuition: 4500, reg: 1500, bus: 1200 },
      { level: 'Grade 7', tuition: 5000, reg: 2000, bus: 1200 },
      { level: 'Grade 8', tuition: 5000, reg: 2000, bus: 1200 },
      { level: 'Grade 9', tuition: 5500, reg: 2000, bus: 1200 },
      { level: 'Grade 10', tuition: 5500, reg: 2000, bus: 1200 },
      { level: 'Grade 11', tuition: 6000, reg: 2500, bus: 1200 },
      { level: 'Grade 12', tuition: 6500, reg: 2500, bus: 1200 },
    ];

    // Insert grade-specific policies
    for (const grade of grades) {
      await pool.query(
        `INSERT INTO financial_policies 
         (id, grade_level, monthly_tuition, registration_fee, bus_fee, penalty_rate, academic_year, branch_id, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT DO NOTHING`,
        [grade.level, grade.tuition, grade.reg, grade.bus, 5, '2026', mainBranchId]
      );
      console.log(`  ✓ ${grade.level}: tuition=${grade.tuition}, reg=${grade.reg}, bus=${grade.bus}`);
    }

    // Insert fallback policy (NULL grade)
    await pool.query(
      `INSERT INTO financial_policies 
       (id, grade_level, monthly_tuition, registration_fee, bus_fee, penalty_rate, academic_year, branch_id, created_at)
       VALUES (gen_random_uuid(), NULL, $1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT DO NOTHING`,
      [5000, 2000, 1200, 5, '2026', mainBranchId]
    );
    console.log(`  ✓ Fallback (NULL grade): tuition=5000, reg=2000, bus=1200`);

    // Verify
    const countRes = await pool.query(
      "SELECT COUNT(*) as count FROM financial_policies WHERE branch_id = $1 AND academic_year = '2026'",
      [mainBranchId]
    );
    console.log(`\n✅ Total policies seeded: ${countRes.rows[0].count}`);

    // Show Grade 2
    const grade2Res = await pool.query(
      "SELECT grade_level, bus_fee FROM financial_policies WHERE branch_id = $1 AND grade_level = 'Grade 2'",
      [mainBranchId]
    );
    console.log('✅ Grade 2 Policy:', grade2Res.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
