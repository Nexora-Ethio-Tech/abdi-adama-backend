const http = require('http');

const BASE = 'localhost';
const PORT = 5000;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: BASE, port: PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function pass(label) { console.log(`  ✅ ${label}`); }
function fail(label, detail) { console.log(`  ❌ ${label}`, detail || ''); }
function header(t) { console.log(`\n━━━ ${t} ━━━`); }

async function run() {
  console.log('\n══════════════════════════════════════════');
  console.log('  Parent & Student Module — E2E Test');
  console.log('══════════════════════════════════════════');

  // 1. Login as Student (STU-8995, PIN: 7293)
  header('1. Student Login');
  const stuLogin = await request('POST', '/api/auth/login', {
    school_id: 'STU-8995', password: '7293', role: 'Student'
  });
  if (stuLogin.status === 200 && stuLogin.body.token) {
    pass(`Student login OK — school_id: ${stuLogin.body.user.school_id}`);
  } else {
    fail('Student login failed', JSON.stringify(stuLogin.body));
    process.exit(1);
  }
  const stuToken = stuLogin.body.token;

  // 2. Student gets own profile
  header('2. GET /api/student/profile (own)');
  const ownProfile = await request('GET', '/api/student/profile', null, stuToken);
  if (ownProfile.status === 200 && ownProfile.body.fullName) {
    pass(`Own profile OK — ${ownProfile.body.fullName}`);
  } else {
    fail('Own profile failed', JSON.stringify(ownProfile.body));
  }

  // 3. Student gets detailed profile with grades
  header('3. GET /api/student/profile/STU-8995');
  const detailedProfile = await request('GET', '/api/student/profile/STU-8995', null, stuToken);
  if (detailedProfile.status === 200 && detailedProfile.body.grades) {
    pass(`Detailed profile OK — ${detailedProfile.body.grades.length} grade(s) found`);
    pass(`Stats: Attendance ${detailedProfile.body.profile.attendance_percentage}%, Rank #${detailedProfile.body.profile.academic_rank}`);
    if (detailedProfile.body.communicationBook) {
      pass(`Communication book found (week ending ${detailedProfile.body.communicationBook.week_ending})`);
    }
  } else {
    fail('Detailed profile failed', JSON.stringify(detailedProfile.body));
  }

  // 4. Student gets history
  header('4. GET /api/student/history/STU-8995');
  const history = await request('GET', '/api/student/history/STU-8995', null, stuToken);
  if (history.status === 200 && history.body.history) {
    const years = Object.keys(history.body.history);
    pass(`History OK — ${years.length} EC year(s): ${years.join(', ')}`);
  } else {
    fail('History failed', JSON.stringify(history.body));
  }

  // 5. Login as Parent (same school_id, parentPassword: 3551)
  header('5. Parent Login');
  const parLogin = await request('POST', '/api/auth/login', {
    school_id: 'STU-8995', password: '3551', role: 'Parent'
  });
  if (parLogin.status === 200 && parLogin.body.token) {
    pass(`Parent login OK`);
  } else {
    fail('Parent login failed', JSON.stringify(parLogin.body));
    process.exit(1);
  }
  const parToken = parLogin.body.token;

  // 6. Parent dashboard
  header('6. GET /api/parent/dashboard');
  const dash = await request('GET', '/api/parent/dashboard', null, parToken);
  if (dash.status === 200) {
    pass(`Dashboard OK — ${dash.body.children.length} child(ren), ${dash.body.announcements.length} announcement(s)`);
    if (dash.body.children.length > 0) {
      pass(`Child: ${dash.body.children[0].fullName} (${dash.body.children[0].school_id})`);
    }
  } else {
    fail('Parent dashboard failed', JSON.stringify(dash.body));
  }

  // 7. Privacy check — parent tries to view a DIFFERENT student (should 403)
  header('7. Privacy Guard — Parent accessing unlinked student');
  const blocked = await request('GET', '/api/student/profile/STU-160688', null, parToken);
  if (blocked.status === 403) {
    pass(`Privacy guard working — 403 returned for unlinked student`);
  } else {
    fail(`Privacy guard FAILED — got ${blocked.status}`, JSON.stringify(blocked.body));
  }

  console.log('\n══════════════════════════════════════════\n');
}

run().catch(console.error);
