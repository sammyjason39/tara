-- Zenvix Backend Database Schema (DB-ready baseline)
-- Scope: finance, hr, inventory, procurement, sales, marketing, payment, admin, it, it-settings
-- Multi-tenant policy: every business table stores tenant_id.

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FINANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_transactions (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  location_id VARCHAR(64),
  amount NUMERIC(18, 2) NOT NULL,
  type VARCHAR(16) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(64),
  status VARCHAR(32) NOT NULL,
  created_by VARCHAR(128),
  approved_by VARCHAR(128),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_tenant ON finance_transactions (tenant_id);

CREATE TABLE IF NOT EXISTS finance_ledger_entries (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  location_id VARCHAR(64),
  amount NUMERIC(18, 2) NOT NULL,
  type VARCHAR(16) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(64),
  balance NUMERIC(18, 2) NOT NULL,
  reference_id VARCHAR(128),
  timestamp TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_tenant ON finance_ledger_entries (tenant_id);

-- ============================================================
-- HR
-- ============================================================
CREATE TABLE IF NOT EXISTS hr_employees (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  location_id VARCHAR(64),
  employee_code VARCHAR(64) NOT NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64),
  department_id VARCHAR(64) NOT NULL,
  manager_id VARCHAR(128),
  role_title VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  employment_type VARCHAR(32) NOT NULL,
  base_salary NUMERIC(18, 2),
  hourly_rate NUMERIC(18, 2),
  hire_date DATE NOT NULL,
  termination_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hr_employees_tenant ON hr_employees (tenant_id);

CREATE TABLE IF NOT EXISTS hr_attendance (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  employee_id VARCHAR(128) NOT NULL,
  location_id VARCHAR(64),
  date DATE NOT NULL,
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  hours_worked NUMERIC(10, 2),
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hr_attendance_tenant ON hr_attendance (tenant_id);

-- ============================================================
-- IT SETTINGS + IT OPS
-- ============================================================
CREATE TABLE IF NOT EXISTS it_devices (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  location_id VARCHAR(64),
  device_type VARCHAR(64) NOT NULL,
  device_name VARCHAR(255) NOT NULL,
  ip_address VARCHAR(64),
  mac_address VARCHAR(64),
  status VARCHAR(32) NOT NULL,
  last_seen TIMESTAMP NOT NULL,
  metadata_json TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_it_devices_tenant ON it_devices (tenant_id);

CREATE TABLE IF NOT EXISTS it_settings (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_it_settings_tenant ON it_settings (tenant_id);

CREATE TABLE IF NOT EXISTS it_provisioning_requests (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(128) NOT NULL,
  supplier_branch_id VARCHAR(128) NOT NULL,
  scope VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  requested_by VARCHAR(128) NOT NULL,
  provisioned_by VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_it_provisioning_tenant ON it_provisioning_requests (tenant_id);

-- ============================================================
-- PROCUREMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS procurement_suppliers (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(128) NOT NULL,
  category VARCHAR(64) NOT NULL,
  branch_code VARCHAR(32) NOT NULL,
  compliance_status VARCHAR(32) NOT NULL,
  rating NUMERIC(8, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_proc_suppliers_tenant ON procurement_suppliers (tenant_id);

CREATE TABLE IF NOT EXISTS procurement_requisitions (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  requester_dept VARCHAR(64) NOT NULL,
  branch_code VARCHAR(32) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  status VARCHAR(64) NOT NULL,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_proc_req_tenant ON procurement_requisitions (tenant_id);

CREATE TABLE IF NOT EXISTS procurement_purchase_orders (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  requisition_id VARCHAR(128) NOT NULL,
  supplier_id VARCHAR(128) NOT NULL,
  branch_code VARCHAR(32) NOT NULL,
  total_amount NUMERIC(18, 2) NOT NULL,
  status VARCHAR(32) NOT NULL,
  issued_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_proc_po_tenant ON procurement_purchase_orders (tenant_id);

CREATE TABLE IF NOT EXISTS procurement_risk_signals (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  code VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_proc_risk_tenant ON procurement_risk_signals (tenant_id);

-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  sku VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL,
  uom VARCHAR(32) NOT NULL,
  barcode VARCHAR(255) NOT NULL,
  qr_code VARCHAR(255) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON inventory_items (tenant_id);

CREATE TABLE IF NOT EXISTS inventory_stock_balances (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(128) NOT NULL,
  location_id VARCHAR(64) NOT NULL,
  department_id VARCHAR(64),
  quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(18, 4) NOT NULL DEFAULT 0,
  avg_unit_cost NUMERIC(18, 4) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(18, 4) NOT NULL DEFAULT 0,
  safety_stock NUMERIC(18, 4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_balances_tenant ON inventory_stock_balances (tenant_id);

CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(128) NOT NULL,
  movement_type VARCHAR(32) NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL,
  unit_cost NUMERIC(18, 4) NOT NULL,
  reason TEXT NOT NULL,
  source_location_id VARCHAR(64),
  source_department_id VARCHAR(64),
  destination_location_id VARCHAR(64),
  destination_department_id VARCHAR(64),
  reference_type VARCHAR(64),
  reference_id VARCHAR(128),
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant ON inventory_stock_movements (tenant_id);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  item_id VARCHAR(128) NOT NULL,
  location_id VARCHAR(64) NOT NULL,
  department_id VARCHAR(64),
  requested_delta NUMERIC(18, 4) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(16) NOT NULL,
  requested_by VARCHAR(128) NOT NULL,
  approved_by VARCHAR(128),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_tenant ON inventory_adjustments (tenant_id);

CREATE TABLE IF NOT EXISTS inventory_alerts (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_tenant ON inventory_alerts (tenant_id);

-- ============================================================
-- ADMIN
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_module_status (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  module_key VARCHAR(64) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by VARCHAR(128) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_module_status_tenant ON admin_module_status (tenant_id);

CREATE TABLE IF NOT EXISTS admin_requests (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  title VARCHAR(255) NOT NULL,
  detail TEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  requested_by VARCHAR(128) NOT NULL,
  resolved_by VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_requests_tenant ON admin_requests (tenant_id);

CREATE TABLE IF NOT EXISTS admin_audit_events (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_tenant ON admin_audit_events (tenant_id);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_leads (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(64),
  source VARCHAR(32) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  potential_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  priority VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL,
  sla_due_at TIMESTAMP NOT NULL,
  first_response_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_leads_tenant ON sales_leads (tenant_id);

CREATE TABLE IF NOT EXISTS sales_opportunities (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  lead_id VARCHAR(128),
  account_name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  stage VARCHAR(32) NOT NULL,
  probability NUMERIC(8, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  expected_close_date DATE NOT NULL,
  health VARCHAR(16) NOT NULL,
  next_action TEXT NOT NULL,
  last_activity_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_tenant ON sales_opportunities (tenant_id);

CREATE TABLE IF NOT EXISTS sales_quotes (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  opportunity_id VARCHAR(128) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  version INTEGER NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  discount_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(18, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  status VARCHAR(32) NOT NULL,
  valid_until DATE NOT NULL,
  approval_by VARCHAR(128),
  approval_at TIMESTAMP,
  notes TEXT,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_quotes_tenant ON sales_quotes (tenant_id);

CREATE TABLE IF NOT EXISTS sales_timeline_events (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  opportunity_id VARCHAR(128) NOT NULL,
  lead_id VARCHAR(128),
  channel VARCHAR(32) NOT NULL,
  direction VARCHAR(32) NOT NULL,
  summary VARCHAR(255) NOT NULL,
  detail TEXT,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_timeline_tenant ON sales_timeline_events (tenant_id);

CREATE TABLE IF NOT EXISTS sales_tasks (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  opportunity_id VARCHAR(128),
  lead_id VARCHAR(128),
  title VARCHAR(255) NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  priority VARCHAR(16) NOT NULL,
  due_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_tasks_tenant ON sales_tasks (tenant_id);

CREATE TABLE IF NOT EXISTS sales_orders (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  opportunity_id VARCHAR(128) NOT NULL,
  quote_id VARCHAR(128),
  customer_name VARCHAR(255) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  status VARCHAR(32) NOT NULL,
  inventory_check VARCHAR(32) NOT NULL,
  finance_invoice_id VARCHAR(128),
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant ON sales_orders (tenant_id);

CREATE TABLE IF NOT EXISTS sales_alerts (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_alerts_tenant ON sales_alerts (tenant_id);

CREATE TABLE IF NOT EXISTS sales_audit_events (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sales_audit_tenant ON sales_audit_events (tenant_id);

-- ============================================================
-- MARKETING
-- ============================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  objective VARCHAR(32) NOT NULL,
  channel_mix_json TEXT NOT NULL,
  owner_id VARCHAR(128) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  budget NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  status VARCHAR(32) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  audience TEXT NOT NULL,
  ai_recommendation TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON marketing_campaigns (tenant_id);

CREATE TABLE IF NOT EXISTS marketing_executions (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  campaign_id VARCHAR(128) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR(32) NOT NULL,
  leads_generated INTEGER NOT NULL DEFAULT 0,
  spend NUMERIC(18, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_executions_tenant ON marketing_executions (tenant_id);

CREATE TABLE IF NOT EXISTS marketing_leads (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  campaign_id VARCHAR(128),
  source VARCHAR(32) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(64),
  country VARCHAR(64),
  industry VARCHAR(128),
  employee_band VARCHAR(64),
  dedup_key VARCHAR(255) NOT NULL,
  score NUMERIC(8, 2) NOT NULL DEFAULT 0,
  intent VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL,
  qualification_reason TEXT NOT NULL,
  sales_handoff_id VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_tenant ON marketing_leads (tenant_id);

CREATE TABLE IF NOT EXISTS marketing_workflows (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  trigger VARCHAR(64) NOT NULL,
  steps_json TEXT NOT NULL,
  ai_suggestion TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_workflows_tenant ON marketing_workflows (tenant_id);

CREATE TABLE IF NOT EXISTS marketing_connected_accounts (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  scopes_json TEXT NOT NULL,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_accounts_tenant ON marketing_connected_accounts (tenant_id);

CREATE TABLE IF NOT EXISTS marketing_attribution (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  campaign_id VARCHAR(128) NOT NULL,
  lead_id VARCHAR(128) NOT NULL,
  opportunity_id VARCHAR(128),
  sales_order_id VARCHAR(128),
  revenue_attributed NUMERIC(18, 2) NOT NULL DEFAULT 0,
  spend NUMERIC(18, 2) NOT NULL DEFAULT 0,
  roi_percent NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_attribution_tenant ON marketing_attribution (tenant_id);

CREATE TABLE IF NOT EXISTS marketing_alerts (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity VARCHAR(16) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_alerts_tenant ON marketing_alerts (tenant_id);

CREATE TABLE IF NOT EXISTS marketing_audit_events (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_marketing_audit_tenant ON marketing_audit_events (tenant_id);

-- ============================================================
-- PAYMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  external_reference VARCHAR(255),
  transaction_type VARCHAR(32) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'IDR',
  destination VARCHAR(255) NOT NULL,
  source VARCHAR(255),
  channel VARCHAR(32) NOT NULL,
  provider_id VARCHAR(64),
  idempotency_key VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL,
  retry_attempts_json TEXT NOT NULL DEFAULT '[]',
  settlement_id VARCHAR(128),
  ledger_sync_triggered_at TIMESTAMP,
  evidence_pack_id VARCHAR(128),
  created_by VARCHAR(128) NOT NULL,
  approved_by VARCHAR(128),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant ON payment_transactions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_idempotency ON payment_transactions (tenant_id, idempotency_key);

CREATE TABLE IF NOT EXISTS payment_providers (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  channels_json TEXT NOT NULL,
  status VARCHAR(16) NOT NULL,
  max_amount_per_txn NUMERIC(18, 2) NOT NULL,
  settlement_sla_hours INTEGER NOT NULL,
  priority INTEGER NOT NULL,
  last_heartbeat_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_providers_tenant ON payment_providers (tenant_id);

CREATE TABLE IF NOT EXISTS payment_routing_policies (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  policy_name VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  priorities_json TEXT NOT NULL,
  fallback_providers_json TEXT NOT NULL,
  max_retries INTEGER NOT NULL DEFAULT 3,
  exponential_backoff_seconds INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_routing_policies_tenant ON payment_routing_policies (tenant_id);

CREATE TABLE IF NOT EXISTS payment_devices (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  location VARCHAR(255) NOT NULL,
  device_code VARCHAR(64) NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR(16) NOT NULL,
  provider_id VARCHAR(64) NOT NULL,
  last_used_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_devices_tenant ON payment_devices (tenant_id);

CREATE TABLE IF NOT EXISTS payment_device_pools (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  location VARCHAR(255) NOT NULL,
  primary_device_id VARCHAR(128) NOT NULL,
  fallback_device_ids_json TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_device_pools_tenant ON payment_device_pools (tenant_id);

CREATE TABLE IF NOT EXISTS payment_settlements (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(128) NOT NULL,
  provider_reference VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_settlements_tenant ON payment_settlements (tenant_id);

CREATE TABLE IF NOT EXISTS payment_refunds (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(128) NOT NULL,
  refund_type VARCHAR(16) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(16) NOT NULL,
  requested_by VARCHAR(128) NOT NULL,
  approved_by VARCHAR(128),
  scheduled_at TIMESTAMP,
  provider_reference VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_tenant ON payment_refunds (tenant_id);

CREATE TABLE IF NOT EXISTS payment_disputes (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(128) NOT NULL,
  reason TEXT NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  status VARCHAR(32) NOT NULL,
  opened_by VARCHAR(128) NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  provider_case_id VARCHAR(255),
  resolution VARCHAR(16),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_tenant ON payment_disputes (tenant_id);

CREATE TABLE IF NOT EXISTS payment_chargebacks (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(128) NOT NULL,
  dispute_id VARCHAR(128) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_chargebacks_tenant ON payment_chargebacks (tenant_id);

CREATE TABLE IF NOT EXISTS payment_evidence_packs (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  payment_id VARCHAR(128) NOT NULL,
  provider_proof VARCHAR(255) NOT NULL,
  approval_signatures_json TEXT NOT NULL,
  checksum VARCHAR(255) NOT NULL,
  payload TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_evidence_packs_tenant ON payment_evidence_packs (tenant_id);

CREATE TABLE IF NOT EXISTS payment_audit_events (
  id VARCHAR(128) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  detail TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_audit_events_tenant ON payment_audit_events (tenant_id);
