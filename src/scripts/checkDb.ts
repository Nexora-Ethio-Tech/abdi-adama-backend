import pool from '../config/database';

async function main() {
  try {
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'pending_applications'
    `);
    console.log('Table exists:', tableCheck.rows);

    if (tableCheck.rows.length > 0) {
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'pending_applications'
      `);
      console.log('Columns:', columns.rows);

      const count = await pool.query(`SELECT COUNT(*) FROM pending_applications WHERE transcript_file_name IS NOT NULL`);
      console.log('Applications with transcripts:', count.rows[0].count);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
