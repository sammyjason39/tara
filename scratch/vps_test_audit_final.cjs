async function runTestAudit() {
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

        console.log("Fetching items...");
        const itemsRes = await fetch(`${BASE_URL}/api/inventory/items?limit=10`, { headers });
        const itemsJson = await itemsRes.json();
        const items = itemsJson.data;
        
        if (!items || items.length < 6) {
            console.error("Not enough items found to perform test.");
            return;
        }

        const anchorItems = items.slice(0, 3);
        const ssItems = items.slice(3, 6);

        // Actual codes from DB
        const anchorLocCode = 'BS-ANC-LOC';
        const ssLocCode = 'BS-SS-LOC';

        console.log(`Performing audit for Anchor (${anchorLocCode})...`);
        const cycle1Res = await fetch(`${BASE_URL}/api/inventory/audit-cycles`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
                location_id: anchorLocCode, // Field name in DTO/Controller might be location_id which maps to location_code in repo
                scope: 'FULL'
            })
        });
        const cycle1 = await cycle1Res.json();
        if (!cycle1.success && !cycle1.id && !cycle1.data) {
            throw new Error("Failed to create Anchor audit cycle: " + JSON.stringify(cycle1));
        }
        const c1Id = cycle1.data ? cycle1.data.id : cycle1.id;
        
        console.log(`Committing Anchor audit (${c1Id})...`);
        const update1Res = await fetch(`${BASE_URL}/api/inventory/audit-cycles/${c1Id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                status: 'COMPLETED',
                items: anchorItems.map((item, i) => ({ id: item.id, actualCount: (i + 1) * 10 }))
            })
        });
        const update1Data = await update1Res.json();
        if (!update1Data.success) {
            console.error("Failed to update Anchor audit:", update1Data);
        }
        console.log("Anchor Audit Completed.");

        console.log(`Performing audit for SS (${ssLocCode})...`);
        const cycle2Res = await fetch(`${BASE_URL}/api/inventory/audit-cycles`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
                location_id: ssLocCode, 
                scope: 'FULL'
            })
        });
        const cycle2 = await cycle2Res.json();
        if (!cycle2.success && !cycle2.id && !cycle2.data) {
            throw new Error("Failed to create SS audit cycle: " + JSON.stringify(cycle2));
        }
        const c2Id = cycle2.data ? cycle2.data.id : cycle2.id;
        
        console.log(`Committing SS audit (${c2Id})...`);
        await fetch(`${BASE_URL}/api/inventory/audit-cycles/${c2Id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                status: 'COMPLETED',
                items: ssItems.map((item, i) => ({ id: item.id, actualCount: (i + 1) * 5 }))
            })
        });
        console.log("SS Audit Completed.");

        console.log("\n--- Verification ---");
        // Wait 2 seconds for DB persistence and service side-effects
        await new Promise(r => setTimeout(r, 2000));
        
        const finalRes = await fetch(`${BASE_URL}/api/inventory/items?limit=10`, { headers });
        const finalJson = await finalRes.json();
        const finalItems = finalJson.data;
        const totalStock = finalItems.reduce((sum, item) => sum + (item.current_stock || 0), 0);
        console.log("Total On-Hand in All Locations view:", totalStock);
        console.log("Items updated:", finalItems.filter(i => i.current_stock > 0).map(i => `${i.name}: ${i.current_stock}`));

    } catch (e) {
        console.error("Test failed:", e.message);
    }
}

runTestAudit();
