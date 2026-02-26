const http = require("http");

const baseURL = "http://localhost:3001/api";

const makeRequest = (path, method, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : "";
    const mergedHeaders = {
      ...headers,
    };
    if (body) {
      mergedHeaders["Content-Type"] = "application/json";
      mergedHeaders["Content-Length"] = Buffer.byteLength(dataString);
    }

    const req = http.request(
      `${baseURL}${path}`,
      { method, headers: mergedHeaders },
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
    if (body) req.write(dataString);
    req.end();
  });
};

async function runTest() {
  console.log("--- Verifying Security Guards (Round 2) ---");

  try {
    // 1. Test LocationGuard: Manager of LOC-A trying to update LOC-B
    console.log(
      "\n1. Testing LocationGuard: Manager assigned to LOC-A trying to PUT /retail/stores/LOC-B...",
    );
    const locationRes = await makeRequest(
      "/retail/stores/LOC-B",
      "PUT",
      { name: "Unauthorized Update" },
      {
        "x-tenant-id": "tenant-001",
        "x-user-role": "MANAGER",
        "x-location-id": "LOC-A",
      },
    );
    console.log("Status:", locationRes.status);
    console.log("Response:", JSON.stringify(locationRes.data, null, 2));

    if (
      locationRes.status === 403 &&
      locationRes.data.detail?.includes("Access Denied")
    ) {
      console.log("✅ LocationGuard correctly blocked cross-location access.");
    } else {
      console.warn("❌ LocationGuard failed to block access correctly.");
    }

    // 2. Test Admin/Owner access (Should pass guards, though it might 404/500 later if ID doesn't exist)
    console.log(
      "\n2. Testing Admin Access: Owner trying to PUT /retail/stores/LOC-B...",
    );
    const adminRes = await makeRequest(
      "/retail/stores/LOC-B",
      "PUT",
      { name: "Authorized Update" },
      {
        "x-tenant-id": "tenant-001",
        "x-user-role": "OWNER",
        "x-location-id": "LOC-A", // Doesn't matter for OWNER
      },
    );
    console.log("Status:", adminRes.status);

    if (adminRes.status !== 403) {
      console.log("✅ LocationGuard correctly bypassed for OWNER.");
    }
  } catch (error) {
    console.error("\n❌ Security Verification Failed:", error.message);
  }
}

runTest();
