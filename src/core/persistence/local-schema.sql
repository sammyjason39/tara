-- Zenvix Local-First Schema (PGLite)
-- Mirrored from Prisma schema for Retail module

-- Force reset tables on every boot to apply migrations (UUID -> TEXT)
DROP TABLE IF EXISTS stock_levels CASCADE;
DROP TABLE IF EXISTS retail_sale_items CASCADE;
DROP TABLE IF EXISTS retail_sales CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS product_prices CASCADE;
DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS bulletin_categories CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    category_id TEXT,
    name TEXT,
    sku TEXT,
    barcode TEXT,
    description TEXT,
    unit TEXT DEFAULT 'PCS',
    base_price NUMERIC(19,4) DEFAULT 0,
    tax_rate NUMERIC(19,4) DEFAULT 0.11,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stock Levels Table
CREATE TABLE IF NOT EXISTS stock_levels (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    location_id TEXT,
    product_id TEXT,
    on_hand NUMERIC(19,4) DEFAULT 0,
    reserved NUMERIC(19,4) DEFAULT 0,
    available NUMERIC(19,4) DEFAULT 0,
    min_buffer NUMERIC(19,4) DEFAULT 0,
    max_capacity NUMERIC(19,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Retail Sales Table
CREATE TABLE IF NOT EXISTS retail_sales (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    store_id TEXT,
    cashier_id TEXT,
    customer_id TEXT,
    total_amount NUMERIC(19,4) DEFAULT 0,
    status TEXT DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Retail Sale Items
CREATE TABLE IF NOT EXISTS retail_sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT,
    product_id TEXT,
    quantity NUMERIC(19,4) DEFAULT 1,
    unit_price NUMERIC(19,4) DEFAULT 0,
    total_price NUMERIC(19,4) DEFAULT 0,
    discount NUMERIC(19,4) DEFAULT 0,
    tenant_id TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON retail_sales(tenant_id);

-- Sync Queue Table
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT,
    payload JSONB,
    attempts INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    position TEXT,
    location_id TEXT,
    status TEXT DEFAULT 'active'
);

-- Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT,
    code TEXT,
    type TEXT,
    status TEXT DEFAULT 'active'
);

-- Product Prices Table
CREATE TABLE IF NOT EXISTS product_prices (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    sku_id TEXT,
    price NUMERIC(19,4) DEFAULT 0,
    is_current BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT,
    legal_entity TEXT,
    work_email TEXT,
    phone TEXT,
    address TEXT,
    timezone TEXT DEFAULT 'UTC',
    logo_url TEXT,
    status TEXT DEFAULT 'active'
);

-- Finance System Mappings
CREATE TABLE IF NOT EXISTS finance_system_mappings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    system_code TEXT,
    account_id TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Finance Settings
CREATE TABLE IF NOT EXISTS finance_settings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT UNIQUE,
    fiscal_year_start_month INTEGER DEFAULT 1,
    fiscal_year_start_day INTEGER DEFAULT 1,
    auto_close_period BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Categories
CREATE TABLE IF NOT EXISTS payroll_categories (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT,
    type TEXT,
    is_fixed BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Adjustment Lines
CREATE TABLE IF NOT EXISTS payroll_adjustment_lines (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    payroll_line_id TEXT,
    category_id TEXT,
    amount NUMERIC(15,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sync Anchors
CREATE TABLE IF NOT EXISTS sync_anchors (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    table_name TEXT,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

