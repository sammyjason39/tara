async function test() {
    const BASE_URL = 'http://150.109.15.108:3010';
    try {
        console.log("Logging in...");
        const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'bambusilverkedonganan@gmail.com',
                password: 'estella1234'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        const tenantId = 'tnt-3rlhko';
        const headers = { 
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
        };

        console.log("1. Fetching Items...");
        const itemsRes = await fetch(`${BASE_URL}/api/inventory/items?limit=1`, { headers });
        const itemsData = await itemsRes.json();
        if (itemsData.items && itemsData.items.length > 0) {
            const item = itemsData.items[0];
            console.log("Found Item:", item.name, "(", item.id, ")");
        } else {
            console.log("No items found.");
        }

        console.log("\n2. Verifying Explorer Folder Structure...");
        const foldersRes = await fetch(`${BASE_URL}/api/explorer/folders`, { headers });
        const foldersData = await foldersRes.json();
        
        const stockOpnameRoot = foldersData.find(f => f.name === 'Stock Opname');
        console.log("Stock Opname Root Found:", !!stockOpnameRoot);
        
        const oldRoot = foldersData.find(f => f.name === 'Stock Opname Reports');
        console.log("Stock Opname Reports (Old Root) Found (Should be false):", !!oldRoot);

        if (stockOpnameRoot) {
            const childrenRes = await fetch(`${BASE_URL}/api/explorer/folders?parentId=${stockOpnameRoot.id}`, { headers });
            const children = await childrenRes.json();
            console.log("Children of Stock Opname:", children.map(c => c.name));
        }

    } catch (e) {
        console.error("Test failed:", e.message);
    }
}

test();
