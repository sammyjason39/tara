import axios from 'axios';

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:8081/api/auth/login', {
      email: 'superadmin@zenvix.id',
      password: 'password123'
    });
    console.log('LOGIN_SUCCESS:', response.status);
    console.log('TOKEN_RECEIVED:', !!response.data.token);
  } catch (error: any) {
    console.log('LOGIN_FAILED:', error.response?.status);
    console.log('ERROR_DATA:', error.response?.data);
  }
}

testLogin();
