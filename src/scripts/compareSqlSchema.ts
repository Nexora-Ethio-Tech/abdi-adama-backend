import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const BASE_DIR = path.resolve(__dirname, '../../database');
const DATABASE_DIRS = [BASE_DIR, path.join(BASE_DIR, 'migrations')];
const EXCLUDE_DIRS = ['newmigrations'];

function readSqlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.includes(entry.name)) continue;
      results.push(...readSqlFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.sql')) {
      results.push(fullPath);
    }
  }
  return results;
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
}

function parseCreateTableDefinitions(sql: string) {
  const createTableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([\w\.\"]+)\s*\(([^;]+?)\)\s*;/gims;
  const defs: Record<string, Set<string>> = {};
  let match;
  while ((match = createTableRegex.exec(sql)) !== null) {
    let tableName = match[1].trim();
    if (tableName.startsWith('"') && tableName.endsWith('"')) {
      tableName = tableName.slice(1, -1);
    }
    if (tableName.includes('.')) {
      tableName = tableName.split('.').pop() as string;
    }
    const body = match[2];
    const cols = new Set<string>();
    const lines = body.split(/,\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const colMatch = line.match(/^"?([a-zA-Z0-9_]+)"?\s+/);
      if (colMatch) {
        const colName = colMatch[1];
        cols.add(colName);
      }
    }
    if (!defs[tableName]) defs[tableName] = new Set();
    for (const c of cols) defs[tableName].add(c);
  }
  return defs;
}

function parseAlterTableAddColumn(sql: string) {
  const alterRegex = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?([\w\.\"]+)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-zA-Z0-9_]+)"?/gims;
  const defs: Record<string, Set<string>> = {};
  let match;
  while ((match = alterRegex.exec(sql)) !== null) {
    let tableName = match[1].trim();
    if (tableName.startsWith('"') && tableName.endsWith('"')) {
      tableName = tableName.slice(1, -1);
    }
    if (tableName.includes('.')) {
      tableName = tableName.split('.').pop() as string;
    }
    const colName = match[2];
    if (!defs[tableName]) defs[tableName] = new Set();
    defs[tableName].add(colName);
  }
  return defs;
}

function mergeDefinitions(...defs: Record<string, Set<string>>[]) {
  const merged: Record<string, Set<string>> = {};
  for (const def of defs) {
    for (const table of Object.keys(def)) {
      if (!merged[table]) merged[table] = new Set();
      for (const col of def[table]) merged[table].add(col);
    }
  }
  return merged;
}

async function main() {
  const files = DATABASE_DIRS.flatMap(readSqlFiles);
  console.log(`Found ${files.length} SQL files in ${DATABASE_DIRS.join(', ')}`);

  const createDefs: Record<string, Set<string>> = {};
  const alterDefs: Record<string, Set<string>> = {};
  const seenTables = new Set<string>();

  for (const file of files) {
    const content = normalizeSql(fs.readFileSync(file, 'utf8'));
    const parsedCreate = parseCreateTableDefinitions(content);
    for (const table of Object.keys(parsedCreate)) {
      seenTables.add(table);
      if (!createDefs[table]) createDefs[table] = new Set();
      for (const col of parsedCreate[table]) createDefs[table].add(col);
    }
    const parsedAlter = parseAlterTableAddColumn(content);
    for (const table of Object.keys(parsedAlter)) {
      seenTables.add(table);
      if (!alterDefs[table]) alterDefs[table] = new Set();
      for (const col of parsedAlter[table]) alterDefs[table].add(col);
    }
  }

  const expectedTableCols = mergeDefinitions(createDefs, alterDefs);
  const expectedTables = Object.keys(expectedTableCols).sort();

  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'abdiadam_school_db',
    user: 'postgres',
    password: '12341234',
  });
  await client.connect();

  const actualTablesResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  const actualTables = actualTablesResult.rows.map((r: any) => r.table_name);

  const actualColumnsResult = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const actualTableCols: Record<string, Set<string>> = {};
  for (const row of actualColumnsResult.rows) {
    if (!actualTableCols[row.table_name]) actualTableCols[row.table_name] = new Set();
    actualTableCols[row.table_name].add(row.column_name);
  }

  const missingTables = expectedTables.filter(t => !actualTables.includes(t));
  const extraTables = actualTables.filter(t => !expectedTables.includes(t));

  console.log('\n--- Table checks ---');
  console.log(`Expected tables: ${expectedTables.length}`);
  console.log(`Actual tables:   ${actualTables.length}`);
  if (missingTables.length) {
    console.log('\nMissing tables:');
    missingTables.forEach(t => console.log(`  - ${t}`));
  } else {
    console.log('No missing tables.');
  }

  if (extraTables.length) {
    console.log('\nExtra tables present in DB but not in SQL definitions:');
    extraTables.forEach(t => console.log(`  - ${t}`));
  } else {
    console.log('No extra tables.');
  }

  const missingColumns: Record<string, string[]> = {};
  for (const table of expectedTables) {
    const expectedCols = expectedTableCols[table] || new Set();
    const actualCols = actualTableCols[table] || new Set();
    const missing = [...expectedCols].filter(col => !actualCols.has(col));
    if (missing.length) missingColumns[table] = missing;
  }

  console.log('\n--- Column checks ---');
  if (Object.keys(missingColumns).length === 0) {
    console.log('No missing expected columns.');
  } else {
    for (const [table, cols] of Object.entries(missingColumns)) {
      console.log(`\n${table}: missing columns -> ${cols.join(', ')}`);
    }
  }

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
