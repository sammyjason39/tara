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

        const testSort = async (name, params) => {
            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${BASE_URL}/api/inventory/items?${query}`, { headers });
            const json = await res.json();
            console.log(`\nSort [${name}]:`);
            json.data?.slice(0, 5).forEach(item => {
                console.log(`- ${item.name}: ${item.current_stock}`);
            });
        };

        await testSort("Highest Quantity", { limit: 10, sortBy: 'quantity', sortOrder: 'desc' });
        await testSort("Lowest Quantity", { limit: 10, sortBy: 'quantity', sortOrder: 'asc' });

    } catch (e) {
        console.error("Verification failed:", e.message);
    }
}

verifySorting();
