const API_URL = "http://localhost:3001/api/finance";
const VALID_TENANT_ID = "ff1752e0-5c04-48a3-9ace-2a6bc9c29b8c";
const HEADERS = {
  "x-tenant-id": VALID_TENANT_ID,
  "x-location-id": "loc-001",
  "x-dev-bypass": "true",
  "x-dev-role": "SUPERADMIN",
  "x-dev-user-id": "dev-admin",
  "Content-Type": "application/json",
};

async function verifyLedger() {
  console.log("--- Verifying Ledger Core API ---");

  try {
    // 1. List Journals first to check connectivity
    console.log("\n1. Listing Journals (Connectivity Check)...");
    const listRes = await fetch(`${API_URL}/ledger`, { headers: HEADERS });
    const listData = await listRes.json();

    if (listRes.ok) {
      console.log("SUCCESS: API is reachable.");
      console.log(`Found ${listData.data?.length || 0} journals.`);
    } else {
      console.error("FAILED: API returned error:", listRes.status, listData);
      return;
    }

    // 2. Create a balanced journal entry
    console.log("\n2. Creating Journal Entry...");
    const journalData = {
      description: "API Verification Entry " + Date.now(),
      ref: "VERIFY-" + Date.now(),
      lines: [
        {
          accountCode: "1001",
          description: "Debit Line",
          debit: 1500.0,
          credit: 0.0,
        },
        {
          accountCode: "2001",
          description: "Credit Line",
          debit: 0.0,
          credit: 1500.0,
        },
      ],
    };

    const createRes = await fetch(`${API_URL}/ledger`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(journalData),
    });

    const createData = await createRes.json();
    console.log("Response Status:", createRes.status);
    console.log("Response Body:", JSON.stringify(createData, null, 2));

    if (createRes.ok && createData.success) {
      console.log("SUCCESS: Journal entry created.");

      // 3. Verify it shows up in list now
      console.log("\n3. Verifying persistence...");
      const listRes2 = await fetch(`${API_URL}/ledger`, { headers: HEADERS });
      const listData2 = await listRes2.json();
      console.log(`Now found ${listData2.data?.length || 0} journals.`);
    } else {
      console.error("FAILED: Journal entry creation failed.");
    }
  } catch (error) {
    console.error("ERROR during verification:", error.message);
  }
}

verifyLedger();
