SELECT id, action, tenant_id, previous_hash FROM audit_logs WHERE tenant_id = 'zenvix-tenant' ORDER BY created_at DESC LIMIT 10;
