import axios from 'axios';

async function verifyRefactor() {
  const API_URL = 'http://localhost:5000/api/admin/create-user';
  
  try {
    const response = await axios.post(API_URL, {
      fullName: 'Refactor Test User',
      role: 'Student'
    });

    console.log('\n═══════════════════════════════════════');
    console.log('  Refactor Verification Results');
    console.log('═══════════════════════════════════════');
    console.log('Status Code:', response.status);
    console.log('School ID  :', response.data.data.school_id);
    console.log('Student PIN:', response.data.data.password);
    console.log('Parent PIN :', response.data.data.parentPassword);
    
    const schoolId = response.data.data.school_id;
    const pin = response.data.data.password;

    if (schoolId.split('-')[1].length === 4 && pin.length === 4) {
      console.log('\n✅ SUCCESS: 4-digit ID and PIN verified!');
    } else {
      console.log('\n❌ FAILURE: Length mismatch.');
    }
    console.log('═══════════════════════════════════════\n');

  } catch (err: any) {
    console.error('Verification failed:', err.response?.data || err.message);
  }
}

verifyRefactor();
