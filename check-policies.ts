import pool from './src/config/database';

(async () => {
  try {
    // Get Main Branch ID
    const branchRes = await pool.query(
      "SELECT id, name FROM branches WHERE name = 'Main Branch' LIMIT 1"
    );
    const mainBranchId = branchRes.rows[0]?.id;
    console.log('✅ Main Branch ID:', mainBranchId);

    // Check ALL financial policies
    const allPoliciesRes = await pool.query(
      "SELECT id, grade_level, bus_fee, branch_id, academic_year FROM financial_policies ORDER BY branch_id, academic_year DESC LIMIT 50"
    );
    console.log('\n📋 ALL Financial Policies in Database:');
    console.log(`Total count: ${allPoliciesRes.rows.length}`);
    allPoliciesRes.rows.forEach(row => {
      console.log(`  Grade: ${row.grade_level}, Bus Fee: ${row.bus_fee}, Academic Year: ${row.academic_year}, Branch: ${row.branch_id}`);
    });

    // Count by branch
    const countRes = await pool.query(
      "SELECT branch_id, COUNT(*) as count FROM financial_policies GROUP BY branch_id"
    );
    console.log('\n📊 Policies count by branch:');
    countRes.rows.forEach(row => {
      console.log(`  Branch ${row.branch_id}: ${row.count} policies`);
    });

    // Get student
    const studentRes = await pool.query(
      "SELECT id, grade FROM students WHERE id = (SELECT user_id FROM users WHERE digital_id = 'STD-MB-0302') LIMIT 1"
    );
    console.log('\n👤 Student Japu Tola:');
    console.log(studentRes.rows[0] || 'NOT FOUND');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
