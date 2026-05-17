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
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, body: { raw } });
        }
      });
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
  header('2. GET /api/student/profile');
  const ownProfile = await request('GET', '/api/student/profile', null, stuToken);
  if (ownProfile.status === 200 && ownProfile.body.data && ownProfile.body.data.fullName) {
    pass(`Own profile OK — Name: ${ownProfile.body.data.fullName}, Section: ${ownProfile.body.data.section}`);
  } else {
    fail('Own profile failed', JSON.stringify(ownProfile.body));
  }

  // 3. Student gets dashboard data
  header('3. GET /api/student/dashboard');
  const dashData = await request('GET', '/api/student/dashboard', null, stuToken);
  if (dashData.status === 200 && dashData.body.data) {
    const d = dashData.body.data;
    pass(`Dashboard OK — ${d.schedule.length} schedule items, ${d.deadlines.length} deadlines, ${d.announcements.length} announcements`);
    pass(`Stats: Attendance ${d.stats.attendance}, Rank ${d.stats.rank}`);
  } else {
    fail('Dashboard failed', JSON.stringify(dashData.body));
  }

  // 4. Student gets current courses & grades
  header('4. GET /api/student/grades');
  const grades = await request('GET', '/api/student/grades?semester=2', null, stuToken);
  if (grades.status === 200 && grades.body.data && grades.body.data.courses) {
    pass(`Grades OK — ${grades.body.data.courses.length} course(s) graded`);
    grades.body.data.courses.forEach(c => {
      pass(`  - ${c.name}: Quiz=${c.quiz_10}, Assign=${c.assignment_10}, Mid=${c.mid_30}, Final=${c.final_50}, Total=${c.total}`);
    });
  } else {
    fail('Grades failed', JSON.stringify(grades.body));
  }

  // 5. Student gets history
  header('5. GET /api/student/history');
  const history = await request('GET', '/api/student/history?year=2024/2025', null, stuToken);
  if (history.status === 200 && history.body.data) {
    pass(`History OK — ${history.body.data.length} academic term record(s) found`);
    history.body.data.forEach(h => {
      pass(`  - ${h.semester} (${h.year}): Average = ${h.average}`);
      h.courses.forEach(c => {
        pass(`    * ${c.name}: Score = ${c.score}`);
      });
    });
  } else {
    fail('History failed', JSON.stringify(history.body));
  }

  // 6. Login as Parent (same school_id, parentPassword: 3551)
  header('6. Parent Login');
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

  // 7. Parent dashboard
  header('7. GET /api/parent/dashboard');
  const parDash = await request('GET', '/api/parent/dashboard', null, parToken);
  if (parDash.status === 200 && parDash.body.data) {
    const pd = parDash.body.data;
    pass(`Dashboard OK — ${pd.children.length} child(ren), ${pd.announcements.length} announcement(s)`);
    if (pd.children.length > 0) {
      pass(`Child: ${pd.children[0].fullName} (${pd.children[0].school_id}), Attendance: ${pd.children[0].attendance}, Perf: ${pd.children[0].performance}`);
    }
  } else {
    fail('Parent dashboard failed', JSON.stringify(parDash.body));
  }

  // 8. Privacy check — parent tries to view a DIFFERENT student's grades (should 403)
  header('8. Privacy Guard — Parent accessing unlinked student');
  const blocked = await request('GET', '/api/student/grades?student_id=STU-2001', null, parToken);
  if (blocked.status === 403) {
    pass(`Privacy guard working — 403 returned for unlinked student`);
  } else {
    fail(`Privacy guard FAILED — got ${blocked.status}`, JSON.stringify(blocked.body));
  }

  console.log('\n══════════════════════════════════════════\n');
}

run().catch(console.error);
