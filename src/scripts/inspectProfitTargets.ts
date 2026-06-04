import pool from '../config/database';

async function main() {
  const table = 'monthly_profit_targets';
  const r = await pool.query(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`
  );
  console.log(`\nTABLE ${table}:`);
  r.rows.forEach((row: any) => console.log(`  ${row.column_name} (${row.data_type}) nullable=${row.is_nullable}`));
  
  const rData = await pool.query(`SELECT * FROM ${table} LIMIT 10`);
  console.log('Sample rows:', rData.rows);

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
