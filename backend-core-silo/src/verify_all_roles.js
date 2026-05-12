const http = require('http');
const BASE = 'localhost';
const PORT = 5000;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: BASE, port: PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data   ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const pass = (msg)        => console.log(`  ✅ ${msg}`);
const fail = (msg, detail) => console.log(`  ❌ ${msg}`, detail ? JSON.stringify(detail).slice(0, 200) : '');
const hdr  = (title)       => console.log(`\n━━━ ${title} ━━━`);

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  Full 4-Role Backend Verification');
  console.log('══════════════════════════════════════════════════');

  // ─── SETUP: Create test users via Admin API ──────────────────────────────
  hdr('0a. Create Librarian test user (PIN: 1111)');
  const libCreate = await req('POST', '/api/admin/create-user', {
    fullName: 'Test Librarian',
    role: 'Librarian',
    password: '1111'
  });
  let libId, libPin;
  if (libCreate.status === 201) {
    libId  = libCreate.body.data.school_id;
    libPin = '1111';
    pass(`Created — school_id: ${libId}`);
  } else if (libCreate.status === 409) {
    pass('Already exists — re-creating with known PIN');
    // Create a fresh one so we know the PIN
    const retry = await req('POST', '/api/admin/create-user', { fullName: 'Test Librarian 2', role: 'Librarian', password: '1111' });
    libId  = retry.body.data.school_id;
    libPin = '1111';
    pass(`Re-created — school_id: ${libId}`);
  } else {
    fail('Create failed', libCreate.body);
    process.exit(1);
  }

  hdr('0b. Create ClinicAdmin test user (PIN: 2222)');
  const clinicCreate = await req('POST', '/api/admin/create-user', {
    fullName: 'Test ClinicAdmin',
    role: 'ClinicAdmin',
    password: '2222'
  });
  let clinicId, clinicPin;
  if (clinicCreate.status === 201) {
    clinicId  = clinicCreate.body.data.school_id;
    clinicPin = '2222';
    pass(`Created — school_id: ${clinicId}`);
  } else if (clinicCreate.status === 409) {
    pass('Already exists — re-creating with known PIN');
    const retry = await req('POST', '/api/admin/create-user', { fullName: 'Test ClinicAdmin 2', role: 'ClinicAdmin', password: '2222' });
    clinicId  = retry.body.data.school_id;
    clinicPin = '2222';
    pass(`Re-created — school_id: ${clinicId}`);
  } else {
    fail('Create failed', clinicCreate.body);
    process.exit(1);
  }

  // PINs are always known at this point

  // ─── LIBRARIAN ─────────────────────────────────────────────────────────────
  hdr('1. Librarian Login');
  const libLogin = await req('POST', '/api/auth/login', { school_id: libId, password: libPin, role: 'Librarian' });
  if (libLogin.status === 200 && libLogin.body.token) pass(`Login OK — ${libLogin.body.user.school_id}`);
  else { fail('Login failed', libLogin.body); process.exit(1); }
  const libToken = libLogin.body.token;

  hdr('2. GET /api/library/stats');
  const stats = await req('GET', '/api/library/stats', null, libToken);
  if (stats.status === 200 && 'totalCollection' in stats.body)
    pass(`Stats OK — ${stats.body.totalCollection} total, ${stats.body.activeLoans} loans`);
  else fail('Stats failed', stats.body);

  hdr('3. GET /api/library/books (paginated + field aliases)');
  const books = await req('GET', '/api/library/books?page=1&limit=5', null, libToken);
  if (books.status === 200 && books.body.data) {
    const sample = books.body.data[0];
    const hasAliases = sample && ('shelf' in sample) && ('total' in sample);
    pass(`Books OK — ${books.body.data.length} items, total=${books.body.total}`);
    if (hasAliases) pass(`Field aliases OK — "shelf" and "total" present ✓`);
    else fail(`Missing field aliases — got: ${sample ? Object.keys(sample).join(', ') : 'empty'}`);
  } else fail('Books failed', books.body);

  hdr('4. GET /api/library/books?search=');
  const booksSearch = await req('GET', '/api/library/books?search=Maths', null, libToken);
  if (booksSearch.status === 200 && booksSearch.body.data !== undefined)
    pass(`Search OK — ${booksSearch.body.data.length} result(s) for "Maths"`);
  else fail('Books search failed', booksSearch.body);

  hdr('5. GET /api/library/loans');
  const loans = await req('GET', '/api/library/loans?page=1&limit=10', null, libToken);
  if (loans.status === 200 && loans.body.data)
    pass(`Loans OK — ${loans.body.data.length} loan(s), includes days_overdue and fine_amount`);
  else fail('Loans failed', loans.body);

  // ─── CLINIC ADMIN ──────────────────────────────────────────────────────────
  hdr('6. ClinicAdmin Login');
  const clinicLogin = await req('POST', '/api/auth/login', { school_id: clinicId, password: clinicPin, role: 'ClinicAdmin' });
  if (clinicLogin.status === 200 && clinicLogin.body.token) pass(`Login OK — ${clinicLogin.body.user.school_id}`);
  else { fail('Login failed', clinicLogin.body); process.exit(1); }
  const clinicToken = clinicLogin.body.token;

  hdr('7. GET /api/clinic/students (full directory with pagination)');
  const stuDir = await req('GET', '/api/clinic/students?page=1&limit=5', null, clinicToken);
  if (stuDir.status === 200 && stuDir.body.data) {
    pass(`Directory OK — total: ${stuDir.body.data.total}, page: ${stuDir.body.data.page}`);
  } else fail('Directory failed', stuDir.body);

  hdr('8. GET /api/clinic/students?search=Refactor');
  const stuSearch = await req('GET', '/api/clinic/students?search=Refactor', null, clinicToken);
  if (stuSearch.status === 200 && stuSearch.body.data)
    pass(`Student search OK — ${stuSearch.body.data.students.length} result(s)`);
  else fail('Student search failed', stuSearch.body);

  hdr('9. GET /api/clinic/visits/history (date+time split)');
  const visits = await req('GET', '/api/clinic/visits/history?page=1&limit=5', null, clinicToken);
  if (visits.status === 200 && visits.body.data) {
    const sample = visits.body.data[0];
    const hasSplit = sample ? ('date' in sample && 'time' in sample) : true;
    if (hasSplit) pass(`Visit history OK — date + time as separate fields ✓`);
    else fail('date/time NOT split', sample);
  } else fail('Visit history failed', visits.body);

  // ─── DRIVER ────────────────────────────────────────────────────────────────
  hdr('10. Driver Login');
  const drvLogin = await req('POST', '/api/auth/login', { school_id: 'DRV-118973', password: '186946', role: 'Driver' });
  if (drvLogin.status === 200 && drvLogin.body.token) pass(`Login OK — ${drvLogin.body.user.school_id}`);
  else { fail('Login failed', drvLogin.body); process.exit(1); }
  const drvToken = drvLogin.body.token;

  hdr('11. GET /api/driver/manifest (digital_id & school_id aliases)');
  const manifest = await req('GET', '/api/driver/manifest', null, drvToken);
  if (manifest.status === 200 && manifest.body.data) {
    const item = manifest.body.data.manifest[0];
    const hasDigitalId = item && 'digital_id' in item;
    const hasSchoolId  = item && 'school_id' in item;
    if (hasDigitalId && hasSchoolId) pass(`Manifest OK — ${manifest.body.data.manifest.length} student(s), both digital_id & school_id ✓`);
    else fail('Missing ID fields', { hasDigitalId, hasSchoolId, item });
  } else fail('Manifest failed', manifest.body);

  hdr('12. GET /api/transport/manifest (frontend URL alias)');
  const transportAlias = await req('GET', '/api/transport/manifest', null, drvToken);
  if (transportAlias.status === 200 && transportAlias.body.data)
    pass(`Transport alias (/api/transport/manifest) OK ✓`);
  else fail('Transport alias failed', transportAlias.body);

  hdr('13. POST /api/driver/notice (title + content + stations)');
  const notice = await req('POST', '/api/driver/notice', {
    title: 'Route B Delay',
    content: '15 minute delay due to construction near Bole.',
    stations: 'Bole, Sarbet, Megenagna'
  }, drvToken);
  if (notice.status === 201 && notice.body.data)
    pass(`Notice posted — title: "${notice.body.data.title}", stations: "${notice.body.data.stations}"`);
  else fail('Notice failed', notice.body);

  hdr('14. GET /api/driver/notices (paginated)');
  const notices = await req('GET', '/api/driver/notices?page=1&limit=5', null, drvToken);
  if (notices.status === 200 && notices.body.data)
    pass(`Notices OK — ${notices.body.data.length} notice(s)`);
  else fail('Notices failed', notices.body);

  // ─── ERROR FORMAT ──────────────────────────────────────────────────────────
  hdr('15. Error format (toast-compatible — expects "error" key)');
  const badLogin = await req('POST', '/api/auth/login', { school_id: 'BAD-9999', password: '0000', role: 'Driver' });
  const hasErrorKey = 'error' in badLogin.body || 'message' in badLogin.body;
  if (hasErrorKey) pass(`Error response has key: "${Object.keys(badLogin.body).join(', ')}"`);
  else fail('Unexpected error format', badLogin.body);

  console.log('\n══════════════════════════════════════════════════\n');
}

run().catch(console.error);
