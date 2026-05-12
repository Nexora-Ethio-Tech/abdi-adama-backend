const http = require('http');

const data = JSON.stringify({
  fullName: 'Refactor Test User',
  role: 'Student'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/create-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    const parsed = JSON.parse(body);
    const schoolId = parsed.data.school_id;
    const pin = parsed.data.password;
    
    console.log('\n--- VERIFICATION ---');
    console.log('School ID:', schoolId);
    console.log('PIN:', pin);
    
    const idSuffix = schoolId.split('-')[1];
    if (idSuffix.length === 4 && pin.length === 4) {
      console.log('✅ SUCCESS: Verified 4-digit ID and 4-digit PIN.');
    } else {
      console.log('❌ FAILURE: Length mismatch.');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
