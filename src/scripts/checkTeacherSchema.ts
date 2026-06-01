import pool from '../config/db';

async function main() {
  try {
    // Check class_teachers columns
    const r1 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'class_teachers' 
      ORDER BY ordinal_position
    `);
    console.log('\n=== class_teachers columns ===');
    r1.rows.forEach((r: any) => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check courses columns
    const r2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'courses' 
      ORDER BY ordinal_position
    `);
    console.log('\n=== courses columns ===');
    r2.rows.forEach((r: any) => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check students section columns
    const r3 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'students' 
      ORDER BY ordinal_position
    `);
    console.log('\n=== students columns ===');
    r3.rows.forEach((r: any) => {
      if (r.column_name.includes('section') || r.column_name.includes('grade') || r.column_name.includes('class')) {
        console.log(`  ${r.column_name}: ${r.data_type}`);
      }
    });

    // Check how many rows are in class_teachers
    const r4 = await pool.query(`SELECT COUNT(*) FROM class_teachers`);
    console.log('\n=== class_teachers row count ===', r4.rows[0].count);

    if (parseInt(r4.rows[0].count) > 0) {
      const r5 = await pool.query(`SELECT * FROM class_teachers LIMIT 5`);
      console.log('\n=== sample class_teachers ===', r5.rows);
    }

    // Get Bekele's assignments
    const bekeleResult = await pool.query(`
      SELECT u.name, t.id AS teacher_id
      FROM teachers t 
      JOIN users u ON t.user_id = u.id 
      WHERE u.name ILIKE '%bekele%' 
      LIMIT 1
    `);
    if (bekeleResult.rows.length > 0) {
      const teacherId = bekeleResult.rows[0].teacher_id;
      
      const r6 = await pool.query(`
        SELECT ct.*, c.name as class_name, c.section as class_section, c.grade as class_grade
        FROM class_teachers ct
        JOIN classes c ON ct.class_id = c.id
        WHERE ct.teacher_id = $1
      `, [teacherId]);
      console.log('\n=== Bekele class_teachers assignments ===', r6.rows);

      const r7 = await pool.query(`
        SELECT co.*, cl.name as class_name, cl.section as class_section, cl.grade as class_grade
        FROM courses co
        JOIN classes cl ON co.class_id = cl.id
        WHERE co.teacher_id = $1
      `, [teacherId]);
      console.log('\n=== Bekele courses assignments ===', r7.rows);
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
