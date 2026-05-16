SELECT id, action, tenant_id, "expectedPrevHash", "actualPrevHash" FROM elite_audit_logs WHERE tenant_id = 'zenvix-tenant' ORDER BY created_at DESC LIMIT 10;
