const http = require("http");

const baseURL = "http://localhost:3001/api";

const makeRequest = (path, method, body, token = null, headersToAdd = {}) => {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : "";
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(dataString),
      ...headersToAdd,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(
      `${baseURL}${path}`,
      { method, headers },
      (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode,
              data: responseData ? JSON.parse(responseData) : null,
            });
          } catch (e) {
            resolve({ status: res.statusCode, data: responseData });
          }
        });
      },
    );

    req.on("error", reject);
    req.write(dataString);
    req.end();
  });
};

async function runTest() {
  console.log("--- Starting Auth & Branch Flow Verification ---");

  const email = "bambusilver" + Date.now() + "@gmail.com";
  const password = "Bambu123456()!";
  const tenantId = "comp-demo-a"; // We use the pre-seeded demo tenant

  let activeToken = "";
  let userId = "";

  try {
    // 0. Register User properly so AuthService.verifyAndGetProfile doesn't 401
    console.log(`\n0. Registering User ${email}`);
    const regRes = await makeRequest("/auth/register", "POST", {
      firstName: "Bambu",
      lastName: "Silver",
      email: email,
      password: password,
    });
    console.log("Register Status:", regRes.status);

    if (regRes.status !== 201 && regRes.status !== 200) {
      console.log("Register Response:", regRes.data);
      throw new Error("Registration failed");
    }

    // 1. Login
    console.log(`\n1. Logging in as: ${email}`);
    const loginRes = await makeRequest("/auth/login", "POST", {
      email,
      password,
    });
    console.log("Login Status:", loginRes.status);
    if (loginRes.status !== 201 && loginRes.status !== 200) {
      console.log("Login Response:", loginRes.data);
      throw new Error("Login failed");
    }

    activeToken = loginRes.data.token || loginRes.data.accessToken;
    userId = loginRes.data.user.id;
    console.log("Obtained JWT Token:", activeToken.substring(0, 20) + "...");
    console.log("Obtained User ID:", userId);

    const reqHeaders = { "x-tenant-id": tenantId, "x-user-role": "SUPERADMIN" };

    // 2. Test Admin Modules endpoint
    console.log(`\n2. Testing GET /api/admin/modules for tenant: ${tenantId}`);
    const adminRes = await makeRequest(
      "/admin/modules",
      "GET",
      null,
      activeToken,
      reqHeaders,
    );

    console.log("Admin Modules Status:", adminRes.status);
    if (adminRes.status === 403) {
      throw new Error(
        "403 Forbidden on Admin Models. ModuleGuard blocked access.",
      );
    }
    if (adminRes.status === 401) {
      console.log("Admin Modules Response:", adminRes.data);
      throw new Error("401 Unauthorized check headers and token validation.");
    }
    console.dir(adminRes.data, { depth: null });

    // 3. Establish Branch
    console.log("\n3. Testing POST /api/retail/stores (Branch Creation)");
    const branchRes = await makeRequest(
      "/retail/stores",
      "POST",
      {
        name: "Bambu Silver Flagship Bali",
        code: "BS-FLG-" + Math.floor(Math.random() * 1000),
        locationId: "loc-demo-1",
        type: "flagship",
        timezone: "Asia/Makassar",
      },
      activeToken,
      reqHeaders,
    );

    console.log("Branch Creation Status:", branchRes.status);
    console.log("Branch Creation Response:");
    console.dir(branchRes.data, { depth: null });

    if (branchRes.status === 403 || branchRes.status === 401) {
      throw new Error(`Branch creation blocked: ${branchRes.status}`);
    }

    if (branchRes.status !== 201 && branchRes.status !== 200) {
      throw new Error("Branch creation failed with status " + branchRes.status);
    }

    console.log("\n✅ E2E Full Flow verified successfully!");
  } catch (error) {
    console.error("\n❌ Test Flow Failed:");
    console.error(error);
  }
}

runTest();
