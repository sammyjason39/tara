async function testLogin() {
  try {
    const response = await fetch('http://localhost:8081/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'superadmin@zenvix.id',
        password: 'password123'
      })
    });
    console.log('LOGIN_SUCCESS:', response.status);
    const data = await response.json();
    console.log('TOKEN_RECEIVED:', !!data.token);
    if (!data.token) {
        console.log('ERROR_DATA:', data);
    }
  } catch (error: any) {
    console.log('LOGIN_ERROR:', error.message);
  }
}

testLogin();
