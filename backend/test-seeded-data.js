const http = require("http");

const baseURL = "http://localhost:3001/api";

const makeRequest = (path, method, headers = {}) => {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${baseURL}${path}`,
      { method, headers },
      (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(responseData) });
          } catch (e) {
            resolve({ status: res.statusCode, data: responseData });
          }
        });
      },
    );

    req.on("error", reject);
    req.end();
  });
};

async function runTest() {
  console.log("--- Verifying Seeded Data via API ---");

  try {
    // 1. Fetch Sales Leads for tenant-001
    console.log("\n1. Fetching Sales Leads for tenant-001...");
    const leadsRes = await makeRequest("/sales/leads", "GET", {
      "x-tenant-id": "tenant-001",
    });
    console.log("Status:", leadsRes.status);
    console.log("Data summary:", {
      count: leadsRes.data.count,
      leads: leadsRes.data.data?.map((l) => ({
        id: l.id,
        name: l.companyName,
      })),
    });

    if (leadsRes.data.count > 0) {
      console.log("\n✅ Seeded Sales Leads verified!");
    } else {
      console.warn(
        "\n⚠️ No leads found for tenant-001. Check seeding or tenant ID.",
      );
    }

    // 2. Fetch IT Settings for tenant-001
    console.log("\n2. Fetching IT Settings for tenant-001...");
    const settingsRes = await makeRequest("/it-settings/settings", "GET", {
      "x-tenant-id": "tenant-001",
    });
    console.log("Status:", settingsRes.status);
    console.log("Data:", settingsRes.data);

    if (settingsRes.status === 200) {
      console.log("\n✅ Seeded IT Settings verified!");
    }
  } catch (error) {
    console.error("\n❌ Verification Failed:", error.message);
  }
}

runTest();
