/**
 * E2E API tests for feature flags module.
 * Run: npx ts-node -r tsconfig-paths/register src/scripts/test-feature-flags-e2e.ts
 * Env: BASE_URL (default http://localhost:3001/v1), ADMIN_EMAIL, ADMIN_PASSWORD
 */
const BASE = (process.env.BASE_URL || 'http://localhost:3001/v1').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'samuel@conextlab.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'demo123';

let passed = 0;
let failed = 0;

function ok(name: string) {
  passed++;
  console.log(`  ✓ ${name}`);
}

function fail(name: string, detail?: string) {
  failed++;
  console.error(`  ✗ ${name}${detail ? `: ${detail}` : ''}`);
}

async function request(
  path: string,
  options: RequestInit & { token?: string } = {},
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function login(): Promise<string | null> {
  const { res, json } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) return null;
  return json?.token || json?.access_token || json?.data?.access_token || null;
}

async function main() {
  console.log(`\nTARA Feature Flags E2E — ${BASE}\n`);

  // 1. Public features endpoint
  {
    const { res, json } = await request('/public/features');
    if (!res.ok) {
      fail('GET /public/features returns 200', `status ${res.status}`);
    } else if (!json?.data?.modules) {
      fail('GET /public/features has modules');
    } else {
      const keys = Object.keys(json.data.modules);
      const expected = [
        'dashboard', 'employees', 'attendance', 'leave', 'payroll',
        'loans', 'schedule', 'sop', 'notifications', 'ai_assistant', 'ai_logs',
      ];
      const missing = expected.filter((k) => !keys.includes(k));
      if (missing.length) {
        fail('GET /public/features has all module keys', `missing: ${missing.join(', ')}`);
      } else {
        ok('GET /public/features returns all module keys');
      }
      if (!Array.isArray(json.data.definitions) || json.data.definitions.length < 10) {
        fail('GET /public/features has definitions');
      } else {
        ok('GET /public/features includes definitions');
      }
    }
  }

  const token = await login();
  if (!token) {
    fail('Admin login', `email=${ADMIN_EMAIL}`);
    console.log(`\n${passed} passed, ${failed} failed\n`);
    process.exit(1);
  }
  ok(`Admin login (${ADMIN_EMAIL})`);

  // 2. Admin GET settings/features
  let originalModules: Record<string, boolean> | null = null;
  {
    const { res, json } = await request('/settings/features', { token });
    if (!res.ok) {
      fail('GET /settings/features returns 200', `status ${res.status}`);
    } else {
      originalModules = json?.data?.modules ?? null;
      ok('GET /settings/features (admin)');
    }
  }

  if (!originalModules) {
    console.log(`\n${passed} passed, ${failed} failed\n`);
    process.exit(1);
  }

  // 3. Disable payroll + loans
  const testModules = {
    ...originalModules,
    payroll: false,
    loans: false,
  };
  {
    const { res, json } = await request('/settings/features', {
      method: 'PUT',
      token,
      body: JSON.stringify({ modules: testModules }),
    });
    if (!res.ok) {
      fail('PUT /settings/features disable payroll+loans', `status ${res.status}`);
    } else if (json?.data?.modules?.payroll !== false || json?.data?.modules?.loans !== false) {
      fail('PUT /settings/features persisted payroll=false, loans=false');
    } else {
      ok('PUT /settings/features disable payroll + loans');
    }
  }

  // 4. Public reflects change
  {
    const { res, json } = await request('/public/features');
    if (json?.data?.modules?.payroll !== false || json?.data?.modules?.loans !== false) {
      fail('Public features reflects disabled payroll/loans');
    } else {
      ok('GET /public/features reflects disabled modules');
    }
  }

  // 5. Payroll API blocked (403)
  {
    const { res } = await request('/payroll/periods', { token });
    if (res.status !== 403) {
      fail('GET /payroll/periods blocked when payroll disabled', `status ${res.status}`);
    } else {
      ok('GET /payroll/periods returns 403 when disabled');
    }
  }

  // 6. Loans API blocked (403)
  {
    const { res } = await request('/payroll/loans', { token });
    if (res.status !== 403) {
      fail('GET /payroll/loans blocked when loans disabled', `status ${res.status}`);
    } else {
      ok('GET /payroll/loans returns 403 when disabled');
    }
  }

  // 7. Attendance still works (not blocked)
  {
    const { res } = await request('/attendance/dashboard', { token });
    if (res.status === 403) {
      fail('Attendance not blocked when only payroll disabled');
    } else {
      ok('Attendance API still accessible');
    }
  }

  // 8. Restore original modules
  {
    const { res } = await request('/settings/features', {
      method: 'PUT',
      token,
      body: JSON.stringify({ modules: originalModules }),
    });
    if (!res.ok) {
      fail('Restore original feature modules', `status ${res.status}`);
    } else {
      ok('Restore original feature modules');
    }
  }

  // 9. Payroll accessible again
  {
    const { res } = await request('/payroll/periods', { token });
    if (res.status === 403) {
      fail('GET /payroll/periods accessible after restore');
    } else {
      ok('GET /payroll/periods accessible after restore');
    }
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
