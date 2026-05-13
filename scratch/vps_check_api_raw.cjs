async function verifySorting() {
    const BASE_URL = 'http://150.109.15.108:3010';
    const tenantId = 'tnt-3rlhko';
    
    try {
        console.log("Logging in...");
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'bambusilverkedonganan@gmail.com', password: 'estella1234' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        const headers = { 
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
        };

        const finalRes = await fetch(`${BASE_URL}/api/inventory/items?limit=10`, { headers });
        const finalJson = await finalRes.json();
        console.log(JSON.stringify(finalJson.data.map(i => ({ name: i.name, stock: i.current_stock })), null, 2));

    } catch (e) {
        console.error("Verification failed:", e.message);
    }
}

verifySorting();
