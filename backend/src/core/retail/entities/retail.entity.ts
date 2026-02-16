export class RetailStore {
  id: string;
  tenant_id: string;
  location_id: string;
  name: string;
  type: 'flagship' | 'express' | 'kiosk' | 'pop-up';
  status: 'active' | 'inactive' | 'maintenance';
  address: string;
  timezone: string;
  currency: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export class RetailProduct {
  id: string;
  tenant_id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  tax_rate: number;
  unit: string;
  status: 'active' | 'discontinued';
  created_at: Date;
  updated_at: Date;
}

export class RetailOrder {
  id: string;
  tenant_id: string;
  location_id: string;
  store_id: string;
  terminal_id: string;
  cashier_id: string;
  customer_id?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  items: RetailOrderItem[];
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  payment_method: 'cash' | 'card' | 'qr' | 'wallet';
  payment_status: 'unpaid' | 'paid' | 'partial';
  created_at: Date;
  updated_at: Date;
}

export class RetailOrderItem {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  discount_amount: number;
  total_price: number;
}

export class RetailShift {
  id: string;
  tenant_id: string;
  location_id: string;
  store_id: string;
  employee_id: string;
  terminal_id: string;
  start_time: Date;
  end_time?: Date;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  status: 'open' | 'closed' | 'reconciled';
  notes?: string;
}
