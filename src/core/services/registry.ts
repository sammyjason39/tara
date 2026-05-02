// ============================================================
// CORE DATA REGISTRY SERVICE
// Read-Only Data Access Layer (Mock Implementation)
// ============================================================
//
// PURPOSE:
// - Centralized, read-only access to core domain data
// - Acts as a mock backend adapter
// - Replaceable by API / DB implementation
//
// NON-GOALS:
// - No mutations
// - No permissions
// - No business enforcement
// - No module registration
//
// ============================================================

import type {
  Staff,
  Product,
  ProductCategory,
  Customer,
  Supplier,
  InventoryEntry,
} from "../types";

/* ============================================================================ */
/* MODULE CONFIG RECORD (PERSISTED STATE)                                       */
/* ============================================================================ */

export interface ModuleConfigRecord {
  id: string;
  organizationId: string;
  moduleId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updatedAt: string; // ISO-8601
}

/* ============================================================================ */
/* MOCK DATA (REPLACED BY API / DB IN PRODUCTION)                                */
/* ============================================================================ */

const categories: ProductCategory[] = [
  {
    id: "cat-1",
    organizationId: "org-1",
    name: "Electronics",
    description: "Electronic items",
    sortOrder: 1,
  },
  {
    id: "cat-2",
    organizationId: "org-1",
    name: "Clothing",
    description: "Apparel and accessories",
    sortOrder: 2,
  },
  {
    id: "cat-3",
    organizationId: "org-1",
    name: "Food & Beverages",
    description: "Consumables",
    sortOrder: 3,
  },
  {
    id: "cat-4",
    organizationId: "org-1",
    name: "Coffee",
    description: "Coffee drinks",
    sortOrder: 1,
    parentId: "cat-3",
  },
  {
    id: "cat-5",
    organizationId: "org-1",
    name: "Pastries",
    description: "Baked goods",
    sortOrder: 2,
    parentId: "cat-3",
  },
];

const products: Product[] = [
  {
    id: "prod-1",
    organizationId: "org-1",
    sku: "SKU001",
    barcode: "1234567890123",
    name: "Wireless Mouse",
    categoryId: "cat-1",
    basePrice: 29.99,
    costPrice: 15,
    taxable: true,
    taxRate: 8.5,
    unit: "piece",
    status: "active",
    attributes: {},
  },
  {
    id: "prod-4",
    organizationId: "org-1",
    sku: "CAFE001",
    name: "Espresso",
    categoryId: "cat-4",
    basePrice: 3.5,
    costPrice: 0.5,
    taxable: true,
    taxRate: 8.5,
    unit: "cup",
    status: "active",
    attributes: {},
    moduleExtensions: {
      cafe: {
        preparationTime: 2,
        station: "espresso",
      },
    },
  },
];

const staff: Staff[] = [
  {
    id: "staff-1",
    organizationId: "org-1",
    employeeId: "EMP001",
    name: "John Smith",
    email: "john@demo.com",
    phone: "555-0101",
    siteId: "site-1",
    position: "Manager",
    status: "active",
    hireDate: "2023-01-15",
    salaryType: "salary",
  },
];

const customers: Customer[] = [
  {
    id: "cust-1",
    organizationId: "org-1",
    type: "individual",
    name: "Alice Brown",
    email: "alice@email.com",
    phone: "555-1001",
    status: "active",
    createdAt: "2024-01-10",
  },
];

const suppliers: Supplier[] = [
  {
    id: "sup-1",
    organizationId: "org-1",
    name: "Coffee Beans Co",
    contactName: "Maria Garcia",
    email: "sales@coffeebeans.com",
    phone: "555-2002",
    paymentTerms: "Net 15",
    status: "active",
  },
];

const inventory: InventoryEntry[] = [
  {
    id: "inv-1",
    organizationId: "org-1",
    siteId: "site-1",
    productId: "prod-4",
    quantity: 500,
    reservedQuantity: 0,
    reorderLevel: 100,
    reorderQuantity: 200,
  },
];

const moduleConfigs: ModuleConfigRecord[] = [
  {
    id: "modcfg-1",
    organizationId: "org-1",
    moduleId: "f&b",
    enabled: true,
    config: {
      waitlistEnabled: true,
      kitchenDisplay: true,
      stations: ["espresso", "bar"],
      layouts: ["tablet", "kiosk"],
    },
    updatedAt: "2024-12-01T10:00:00Z",
  },
];

/* ============================================================================ */
/* INTERNAL FILTER HELPERS                                                       */
/* ============================================================================ */

function byOrganization<T extends { organizationId: string }>(
  items: readonly T[],
  organizationId: string,
): T[] {
  return (Array.isArray(items) ? items : []).filter((i) => i.organizationId === organizationId);
}

function bySite<T extends { siteId?: string }>(
  items: readonly T[],
  siteId?: string,
): T[] {
  if (!siteId) return [...items];
  return (Array.isArray(items) ? items : []).filter((i) => i.siteId === siteId);
}

/* ============================================================================ */
/* DATA REGISTRY API (READ-ONLY)                                                 */
/* ============================================================================ */

export const registry = {
  /* ------------------------------------------------------------------------ */
  /* PRODUCTS                                                                 */
  /* ------------------------------------------------------------------------ */

  getProducts(params: {
    organizationId: string;
    categoryId?: string;
    status?: Product["status"];
    moduleId?: string;
  }): Product[] {
    let result = byOrganization(products, params.organizationId);

    if (params.categoryId) {
      result = (Array.isArray(result) ? result : []).filter((p) => p.categoryId === params.categoryId);
    }

    if (params.status) {
      result = (Array.isArray(result) ? result : []).filter((p) => p.status === params.status);
    }

    if (params.moduleId) {
      result = (Array.isArray(result) ? result : []).filter((p) =>
        Boolean(p.moduleExtensions?.[params.moduleId]),
      );
    }

    return result;
  },

  getProductById(productId: string): Product | undefined {
    return products.find((p) => p.id === productId);
  },

  getProductByBarcode(barcode: string): Product | undefined {
    return products.find((p) => p.barcode === barcode);
  },

  /* ------------------------------------------------------------------------ */
  /* CATEGORIES                                                               */
  /* ------------------------------------------------------------------------ */

  getCategories(params: {
    organizationId: string;
    parentId?: string;
  }): ProductCategory[] {
    let result = byOrganization(categories, params.organizationId);

    if (params.parentId !== undefined) {
      result = (Array.isArray(result) ? result : []).filter((c) => c.parentId === params.parentId);
    }

    return result.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  /* ------------------------------------------------------------------------ */
  /* STAFF                                                                    */
  /* ------------------------------------------------------------------------ */

  getStaff(params: { organizationId: string; siteId?: string }): Staff[] {
    return bySite(byOrganization(staff, params.organizationId), params.siteId);
  },

  getStaffById(staffId: string): Staff | undefined {
    return staff.find((s) => s.id === staffId);
  },

  /* ------------------------------------------------------------------------ */
  /* CUSTOMERS                                                                */
  /* ------------------------------------------------------------------------ */

  getCustomers(organizationId: string): Customer[] {
    return byOrganization(customers, organizationId);
  },

  getCustomerById(customerId: string): Customer | undefined {
    return customers.find((c) => c.id === customerId);
  },

  /* ------------------------------------------------------------------------ */
  /* SUPPLIERS                                                                */
  /* ------------------------------------------------------------------------ */

  getSuppliers(organizationId: string): Supplier[] {
    return byOrganization(suppliers, organizationId);
  },

  getSupplierById(supplierId: string): Supplier | undefined {
    return suppliers.find((s) => s.id === supplierId);
  },

  /* ------------------------------------------------------------------------ */
  /* INVENTORY                                                                */
  /* ------------------------------------------------------------------------ */

  getInventory(params: {
    organizationId: string;
    siteId: string;
  }): InventoryEntry[] {
    return (Array.isArray(inventory) ? inventory : []).filter(
      (i) =>
        i.organizationId === params.organizationId &&
        i.siteId === params.siteId,
    );
  },

  getInventoryEntry(params: {
    productId: string;
    siteId: string;
  }): InventoryEntry | undefined {
    return inventory.find(
      (i) => i.productId === params.productId && i.siteId === params.siteId,
    );
  },

  getLowStock(params: {
    organizationId: string;
    siteId: string;
  }): InventoryEntry[] {
    return (Array.isArray(inventory) ? inventory : []).filter(
      (i) =>
        i.organizationId === params.organizationId &&
        i.siteId === params.siteId &&
        i.quantity <= i.reorderLevel,
    );
  },

  /* ------------------------------------------------------------------------ */
  /* MODULE CONFIG (READ-ONLY)                                                 */
  /* ------------------------------------------------------------------------ */

  getModuleConfigs(organizationId: string): ModuleConfigRecord[] {
    return byOrganization(moduleConfigs, organizationId);
  },

  getModuleConfig(params: {
    organizationId: string;
    moduleId: string;
  }): ModuleConfigRecord | undefined {
    return moduleConfigs.find(
      (c) =>
        c.organizationId === params.organizationId &&
        c.moduleId === params.moduleId,
    );
  },
};
