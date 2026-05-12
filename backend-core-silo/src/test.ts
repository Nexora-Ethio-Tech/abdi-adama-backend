/**
 * Quick integration test — run with: npx ts-node src/test.ts
 * Tests: create-user (Student) → login as Student → login as Parent
 */
import http from 'http';

const BASE = 'http://localhost:5000';

function post(path: string, body: object): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(body);
    const url = new URL(path, BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(json),
        },
      },
      (res: http.IncomingMessage) => {
        let raw = '';
        res.on('data', (chunk: Buffer) => (raw += chunk.toString()));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode ?? 0, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

function log(label: string, result: { status: number; data: any }) {
  const ok = result.status >= 200 && result.status < 300;
  console.log(`\n${ok ? '✅' : '❌'} ${label}`);
  console.log(`   Status : ${result.status}`);
  console.log(`   Body   : ${JSON.stringify(result.data, null, 2).replace(/\n/g, '\n   ')}`);
}

async function run() {
  console.log('\n═══════════════════════════════════════');
  console.log('  Silo API — Integration Test Suite');
  console.log('  (Testing Automated Passwords)');
  console.log('═══════════════════════════════════════');

  // 1. Create a Student (Automated Passwords)
  const create = await post('/api/admin/create-user', {
    fullName: 'Abdi Adama',
    role: 'Student',
  });
  log('POST /api/admin/create-user (Student - Auto Passwords)', create);

  const school_id: string = create.data?.data?.school_id ?? '';
  const studentPin: string = create.data?.data?.password ?? '';
  const parentPin: string = create.data?.data?.parentPassword ?? '';

  if (!school_id || !studentPin || !parentPin) {
    console.log('\n⚠  Missing data in response — check server logs.');
    return;
  }

  // 2. Login as Student
  const studentLogin = await post('/api/auth/login', {
    school_id,
    password: studentPin,
    role: 'Student',
  });
  log('POST /api/auth/login (Student with Generated PIN)', studentLogin);

  // 3. Login as Parent
  const parentLogin = await post('/api/auth/login', {
    school_id,
    password: parentPin,
    role: 'Parent',
  });
  log('POST /api/auth/login (Parent with Generated PIN)', parentLogin);

  // 4. Wrong role should fail
  const wrongRole = await post('/api/auth/login', {
    school_id,
    password: '123456',
    role: 'Driver',
  });
  log('POST /api/auth/login (wrong role — should be 401)', wrongRole);

  // 5. Wrong password should fail
  const wrongPw = await post('/api/auth/login', {
    school_id,
    password: '000000',
    role: 'Student',
  });
  log('POST /api/auth/login (wrong password — should be 401)', wrongPw);

  // 6. Create a Driver (Auto Password)
  const driverCreate = await post('/api/admin/create-user', {
    fullName: 'Yonas Bekele',
    role: 'Driver',
  });
  log('POST /api/admin/create-user (Driver - Auto Password)', driverCreate);

  // 7. Validation: Parent-only role should be blocked
  const parentDirect = await post('/api/admin/create-user', {
    fullName: 'Test Parent',
    role: 'Parent',
  });
  log('POST /api/admin/create-user (Parent direct — should be 400)', parentDirect);

  // 8. Validation: missing required fields
  const missingFields = await post('/api/admin/create-user', {
    role: 'Student',
  });
  log('POST /api/admin/create-user (missing fullName — should be 400)', missingFields);

  console.log('\n═══════════════════════════════════════');
  console.log('  Test suite complete.');
  console.log('═══════════════════════════════════════\n');
}

run().catch(console.error);
