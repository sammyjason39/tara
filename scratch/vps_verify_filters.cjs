async function verifyFilters() {
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

        const testFilter = async (name, params) => {
            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${BASE_URL}/api/inventory/items?${query}`, { headers });
            const json = await res.json();
            console.log(`Filter [${name}]: Found ${json.data?.length || 0} items. Total: ${json.meta?.total || 0}`);
        };

        console.log("\n--- Filter Testing ---");
        await testFilter("All Items", { limit: 10 });
        await testFilter("Anchor Location", { location_id: 'a370e7ca-c1f7-4180-8824-846eaa6a3c8e' });
        await testFilter("SS Location", { location_id: 'ccd6c269-7a9e-4540-8b20-198ac296f701' });
        await testFilter("Sort: Highest Quantity", { sortBy: 'quantity', sortOrder: 'desc' });
        await testFilter("Sort: Lowest Quantity", { sortBy: 'quantity', sortOrder: 'asc' });
        await testFilter("Sort: Name A-Z", { sortBy: 'name', sortOrder: 'asc' });

    } catch (e) {
        console.error("Verification failed:", e.message);
    }
}

verifyFilters();
