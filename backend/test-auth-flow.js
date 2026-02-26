const http = require('http');

const baseURL = 'http://localhost:3001/api';

const makeRequest = (path, method, body, token = null) => {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': dataString.length,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      `${baseURL}${path}`,
      { method, headers },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => responseData += chunk);
        res.on('end', () => {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        });
      }
    );

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
};

async function runTest() {
  console.log('--- Starting Auth Flow Verification ---');
  const uniqueEmail = `admin-${Date.now()}@zenvix.test`;

  try {
    // 1. Register
    console.log(`\n1. Registering new user: ${uniqueEmail}`);
    const regRes = await makeRequest('/auth/register', 'POST', {
      firstName: 'Test',
      lastName: 'Admin',
      email: uniqueEmail,
      password: 'StrongPassword123!'
    });
    console.log('Register Response:', regRes.data);
    if (regRes.status !== 201) throw new Error('Registration failed');

    // 2. Login
    console.log(`\n2. Logging in as: ${uniqueEmail}`);
    const loginRes = await makeRequest('/auth/login', 'POST', {
      email: uniqueEmail,
      password: 'StrongPassword123!'
    });
    console.log('Login Response:', loginRes.data);
    if (loginRes.status !== 201) throw new Error('Login failed');
    const token = loginRes.data.token;
    console.log('Obtained JWT Token:', token.substring(0, 20) + '...');

    // 3. Provision Company
    console.log(`\n3. Provisioning Company for the user`);
    const provRes = await makeRequest('/auth/company/provision', 'POST', {
      name: 'Zenith Test Corp',
      industry: 'technology',
      country: 'US'
    }, token);
    console.log('Provisioning Response:', JSON.stringify(provRes.data, null, 2));
    if (provRes.status !== 201) throw new Error('Provisioning failed');

    console.log('\n✅ E2E Auth Flow verified successfully!');
  } catch (error) {
    console.error('\n❌ Test Flow Failed:', error.message);
  }
}

runTest();
