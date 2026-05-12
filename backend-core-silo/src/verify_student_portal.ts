/**
 * verify_student_portal.ts
 *
 * Task 5: Final Connection Ping
 *
 * Logs in as Abebe Bikila (STU-2001) and sends GET requests to all Student Portal
 * API endpoints, printing a color-coded pass/fail report.
 *
 * Run from backend-core-silo/:
 *   npx ts-node src/verify_student_portal.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const SCHOOL_ID = 'STU-2001';
const PASSWORD  = '1234';
const ROLE      = 'Student';

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

interface TestResult {
  endpoint: string;
  status: number | null;
  passed: boolean;
  note?: string;
}

async function login(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_id: SCHOOL_ID, password: PASSWORD, role: ROLE }),
    });
    const data = await res.json() as any;
    if (res.ok && data.token) {
      console.log(`${GREEN}✅ Login successful as ${SCHOOL_ID}${RESET}`);
      return data.token;
    }
    console.error(`${RED}❌ Login failed: ${data.message || JSON.stringify(data)}${RESET}`);
    return null;
  } catch (err: any) {
    console.error(`${RED}❌ Login error: ${err.message}${RESET}`);
    return null;
  }
}

async function ping(endpoint: string, token: string): Promise<TestResult> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const passed = res.status === 200;
    return { endpoint, status: res.status, passed };
  } catch (err: any) {
    return { endpoint, status: null, passed: false, note: err.message };
  }
}

async function main() {
  console.log(`\n${BOLD}══════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  Student Portal API Verification Script${RESET}`);
  console.log(`${BOLD}  Target: ${BASE_URL}${RESET}`);
  console.log(`${BOLD}══════════════════════════════════════════════════${RESET}\n`);

  const token = await login();
  if (!token) {
    console.error(`\n${RED}${BOLD}Aborting: cannot get a valid token.${RESET}\n`);
    process.exit(1);
  }

  const endpoints = [
    '/api/student/profile',
    '/api/student/dashboard',
    '/api/student/grades?semester=2',
    '/api/student/history?year=2024/2025',
    '/api/student/academic-history',
  ];

  console.log('');
  const results: TestResult[] = [];
  for (const ep of endpoints) {
    const result = await ping(ep, token);
    results.push(result);
    const icon  = result.passed ? `${GREEN}✅` : `${RED}❌`;
    const label = result.passed ? `HTTP ${result.status} OK` : `HTTP ${result.status ?? 'ERROR'} ${result.note || ''}`;
    console.log(`${icon}  ${ep.padEnd(45)} ${YELLOW}${label}${RESET}`);
  }

  const passed = results.filter(r => r.passed).length;
  const total  = results.length;

  console.log(`\n${BOLD}══════════════════════════════════════════════════${RESET}`);
  if (passed === total) {
    console.log(`${GREEN}${BOLD}  ALL ${total}/${total} ENDPOINTS PASSED ✅${RESET}`);
  } else {
    console.log(`${RED}${BOLD}  ${total - passed} ENDPOINT(S) FAILED ❌  (${passed}/${total} passed)${RESET}`);
  }
  console.log(`${BOLD}══════════════════════════════════════════════════${RESET}\n`);
  process.exit(passed === total ? 0 : 1);
}

main();
