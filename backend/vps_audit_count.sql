SELECT COUNT(*) FROM audit_logs WHERE tenant_id = 'zenvix-tenant' AND (previous_hash IS NULL OR hash_chain IS NULL);
