// Mock Data for Local-First Business Operations Platform

import { Organization, Role, Site, User } from "@/core/types";
import {
  formatCurrency as formatCurrencyCanonical,
  formatDate as formatDateCanonical,
} from "@/lib/format";

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: "manager" | "cashier" | "server" | "kitchen" | "admin" | "waiter";
  pin: string;
  avatar?: string;
  status: "active" | "inactive";
  shiftStart?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  barcode?: string;
  stock?: number;
  modifiers?: ProductModifier[];
}

export interface ProductModifier {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  modifiers?: ProductModifier[];
  notes?: string;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
  currentOrder?: {
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      price: number;
      modifiers?: string[];
    }>;
    total: number;
  };
  occupiedSince?: string;
  position: { x: number; y: number };
}

export interface Order {
  id: string;
  tableId?: string;
  items: CartItem[];
  status: "new" | "preparing" | "ready" | "served" | "billed";
  createdAt: string;
  total: number;
  staffId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  type: "maintenance" | "security" | "customer" | "staff" | "other";
  status: "open" | "investigating" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  reportedBy: string;
  reportedAt: string;
  location?: string;
  createdAt: string;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  license: "active" | "trial" | "expired" | "upgrade";
  category: "pos" | "operations" | "integrations" | "analytics";
}

export interface SalesData {
  date: string;
  sales: number;
  transactions: number;
  avgTicket: number;
  totalSales: number;
  averageOrder: number;
}

export interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  activeStaff: number;
  openIssues: number;
  salesTrend: number;
  topProducts: { name: string; sales: number }[];
}

// Mock Staff Data
export const mockStaff: Staff[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    role: "manager",
    pin: "1234",
    status: "active",
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike@example.com",
    role: "cashier",
    pin: "2345",
    status: "active",
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "emily@example.com",
    role: "server",
    pin: "3456",
    status: "active",
  },
  {
    id: "4",
    name: "Carlos Rodriguez",
    email: "carlos@example.com",
    role: "kitchen",
    pin: "4567",
    status: "active",
  },
  {
    id: "5",
    name: "Anna Williams",
    email: "anna@example.com",
    role: "cashier",
    pin: "5678",
    status: "active",
  },
  {
    id: "6",
    name: "James Brown",
    email: "james@example.com",
    role: "server",
    pin: "6789",
    status: "inactive",
  },
];

// Mock Product Categories
export const productCategories = [
  "Hot Drinks",
  "Cold Drinks",
  "Pastries",
  "Sandwiches",
  "Salads",
  "Snacks",
  "Retail",
];

// Mock Products - Retail
export const mockRetailProducts: Product[] = [
  {
    id: "r1",
    name: "Coffee Beans 250g",
    price: 14.99,
    category: "Retail",
    barcode: "1234567890123",
    stock: 45,
  },
  {
    id: "r2",
    name: "Ceramic Mug",
    price: 12.0,
    category: "Retail",
    barcode: "1234567890124",
    stock: 28,
  },
  {
    id: "r3",
    name: "Travel Tumbler",
    price: 24.99,
    category: "Retail",
    barcode: "1234567890125",
    stock: 15,
  },
  {
    id: "r4",
    name: "Gift Card $25",
    price: 25.0,
    category: "Retail",
    barcode: "1234567890126",
    stock: 100,
  },
  {
    id: "r5",
    name: "Gift Card $50",
    price: 50.0,
    category: "Retail",
    barcode: "1234567890127",
    stock: 100,
  },
  {
    id: "r6",
    name: "French Press",
    price: 34.99,
    category: "Retail",
    barcode: "1234567890128",
    stock: 12,
  },
  {
    id: "r7",
    name: "Pour Over Set",
    price: 29.99,
    category: "Retail",
    barcode: "1234567890129",
    stock: 8,
  },
  {
    id: "r8",
    name: "Espresso Cups Set",
    price: 18.0,
    category: "Retail",
    barcode: "1234567890130",
    stock: 20,
  },
];

// Mock Products - Cafe
export const mockCafeProducts: Product[] = [
  {
    id: "c1",
    name: "Espresso",
    price: 2.5,
    category: "Hot Drinks",
    modifiers: [
      { id: "m1", name: "Extra Shot", price: 0.75 },
      { id: "m2", name: "Oat Milk", price: 0.5 },
    ],
  },
  {
    id: "c2",
    name: "Cappuccino",
    price: 4.0,
    category: "Hot Drinks",
    modifiers: [
      { id: "m1", name: "Extra Shot", price: 0.75 },
      { id: "m2", name: "Oat Milk", price: 0.5 },
      { id: "m3", name: "Vanilla Syrup", price: 0.5 },
    ],
  },
  {
    id: "c3",
    name: "Latte",
    price: 4.5,
    category: "Hot Drinks",
    modifiers: [
      { id: "m1", name: "Extra Shot", price: 0.75 },
      { id: "m2", name: "Oat Milk", price: 0.5 },
      { id: "m4", name: "Caramel Syrup", price: 0.5 },
    ],
  },
  { id: "c4", name: "Americano", price: 3.0, category: "Hot Drinks" },
  { id: "c5", name: "Hot Chocolate", price: 3.5, category: "Hot Drinks" },
  { id: "c6", name: "Iced Latte", price: 5.0, category: "Cold Drinks" },
  { id: "c7", name: "Cold Brew", price: 4.5, category: "Cold Drinks" },
  { id: "c8", name: "Iced Tea", price: 3.0, category: "Cold Drinks" },
  { id: "c9", name: "Smoothie", price: 5.5, category: "Cold Drinks" },
  { id: "c10", name: "Croissant", price: 3.5, category: "Pastries" },
  { id: "c11", name: "Muffin", price: 3.0, category: "Pastries" },
  { id: "c12", name: "Scone", price: 2.75, category: "Pastries" },
  { id: "c13", name: "Danish", price: 3.25, category: "Pastries" },
  { id: "c14", name: "Club Sandwich", price: 8.5, category: "Sandwiches" },
  { id: "c15", name: "BLT", price: 7.5, category: "Sandwiches" },
  { id: "c16", name: "Veggie Wrap", price: 7.0, category: "Sandwiches" },
  { id: "c17", name: "Caesar Salad", price: 9.0, category: "Salads" },
  { id: "c18", name: "Greek Salad", price: 8.5, category: "Salads" },
  { id: "c19", name: "Chips", price: 1.5, category: "Snacks" },
  { id: "c20", name: "Cookie", price: 2.0, category: "Snacks" },
];

// Mock Tables
export const mockTables: Table[] = [
  {
    id: "t1",
    number: 1,
    capacity: 2,
    status: "available",
    position: { x: 0, y: 0 },
  },
  {
    id: "t2",
    number: 2,
    capacity: 2,
    status: "occupied",
    occupiedSince: new Date(Date.now() - 30 * 60000).toISOString(),
    currentOrder: {
      items: [{ productId: "c1", name: "Cappuccino", quantity: 2, price: 4.0 }],
      total: 8.0,
    },
    position: { x: 1, y: 0 },
  },
  {
    id: "t3",
    number: 3,
    capacity: 4,
    status: "occupied",
    occupiedSince: new Date(Date.now() - 45 * 60000).toISOString(),
    currentOrder: {
      items: [
        { productId: "c13", name: "Club Sandwich", quantity: 1, price: 11.0 },
      ],
      total: 11.0,
    },
    position: { x: 2, y: 0 },
  },
  {
    id: "t4",
    number: 4,
    capacity: 4,
    status: "available",
    position: { x: 3, y: 0 },
  },
  {
    id: "t5",
    number: 5,
    capacity: 6,
    status: "cleaning",
    position: { x: 0, y: 1 },
  },
  {
    id: "t6",
    number: 6,
    capacity: 6,
    status: "available",
    position: { x: 1, y: 1 },
  },
  {
    id: "t7",
    number: 7,
    capacity: 4,
    status: "reserved",
    position: { x: 2, y: 1 },
  },
  {
    id: "t8",
    number: 8,
    capacity: 2,
    status: "available",
    position: { x: 3, y: 1 },
  },
  {
    id: "t9",
    number: 9,
    capacity: 8,
    status: "available",
    position: { x: 0, y: 2 },
  },
  {
    id: "t10",
    number: 10,
    capacity: 4,
    status: "occupied",
    occupiedSince: new Date(Date.now() - 15 * 60000).toISOString(),
    currentOrder: {
      items: [{ productId: "c5", name: "Latte", quantity: 2, price: 4.5 }],
      total: 9.0,
    },
    position: { x: 1, y: 2 },
  },
  {
    id: "t11",
    number: 11,
    capacity: 2,
    status: "available",
    position: { x: 2, y: 2 },
  },
  {
    id: "t12",
    number: 12,
    capacity: 2,
    status: "available",
    position: { x: 3, y: 2 },
  },
];

// Mock Kitchen Orders
export const mockKitchenOrders: Order[] = [
  {
    id: "ko1",
    tableId: "t2",
    items: [
      { product: mockCafeProducts[1], quantity: 2 },
      { product: mockCafeProducts[9], quantity: 2 },
    ],
    status: "new",
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    total: 15.0,
    staffId: "3",
  },
  {
    id: "ko2",
    tableId: "t7",
    items: [
      { product: mockCafeProducts[13], quantity: 1 },
      { product: mockCafeProducts[16], quantity: 1 },
      { product: mockCafeProducts[5], quantity: 2 },
    ],
    status: "preparing",
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    total: 27.5,
    staffId: "3",
  },
  {
    id: "ko3",
    tableId: "t3",
    items: [
      { product: mockCafeProducts[2], quantity: 3 },
      { product: mockCafeProducts[10], quantity: 3 },
    ],
    status: "ready",
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    total: 22.5,
    staffId: "5",
  },
];

// Mock Tasks
export const mockTasks: Task[] = [
  {
    id: "task1",
    title: "Restock coffee beans",
    description: "Order more Ethiopian blend from supplier",
    status: "pending",
    priority: "high",
    assignedTo: "1",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "task2",
    title: "Clean espresso machine",
    description: "Weekly deep cleaning maintenance",
    status: "in-progress",
    priority: "medium",
    assignedTo: "2",
    createdAt: new Date().toISOString(),
  },
  {
    id: "task3",
    title: "Update menu prices",
    description: "Apply 5% price increase to beverages",
    status: "completed",
    priority: "low",
    assignedTo: "1",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "task4",
    title: "Train new staff",
    description: "Onboarding session for new cashiers",
    status: "pending",
    priority: "high",
    assignedTo: "1",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

// Mock Incidents
export const mockIncidents: Incident[] = [
  {
    id: "inc1",
    title: "Broken door handle",
    description: "Front entrance door handle is loose and needs repair",
    type: "maintenance",
    status: "open",
    priority: "medium",
    reportedBy: "Mike Chen",
    reportedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    location: "Front Entrance",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: "inc2",
    title: "Customer complaint",
    description: "Customer received wrong order, refund processed",
    type: "customer",
    status: "resolved",
    priority: "low",
    reportedBy: "Emily Davis",
    reportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    location: "Main Floor",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "inc3",
    title: "POS connectivity issue",
    description: "Terminal 2 intermittently losing connection",
    type: "maintenance",
    status: "investigating",
    priority: "high",
    reportedBy: "Sarah Johnson",
    reportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    location: "Counter Area",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock Modules
export const mockModules: Module[] = [
  {
    id: "mod1",
    name: "POS Retail",
    description: "Point of sale for retail operations with barcode scanning",
    icon: "ShoppingCart",
    enabled: true,
    license: "active",
    category: "pos",
  },
  {
    id: "mod2",
    name: "POS Cafe",
    description: "Table-based ordering system for cafes and restaurants",
    icon: "Coffee",
    enabled: true,
    license: "active",
    category: "pos",
  },
  {
    id: "mod3",
    name: "Inventory",
    description: "Stock tracking and automatic reorder management",
    icon: "Package",
    enabled: true,
    license: "trial",
    category: "operations",
  },
  {
    id: "mod4",
    name: "IoT Sensors",
    description: "Connect temperature, humidity, and motion sensors",
    icon: "Thermometer",
    enabled: false,
    license: "upgrade",
    category: "integrations",
  },
  {
    id: "mod5",
    name: "CCTV Integration",
    description: "View camera feeds and manage recordings",
    icon: "Video",
    enabled: false,
    license: "upgrade",
    category: "integrations",
  },
  {
    id: "mod6",
    name: "Accounting",
    description: "QuickBooks and Xero integration for bookkeeping",
    icon: "Calculator",
    enabled: false,
    license: "upgrade",
    category: "integrations",
  },
  {
    id: "mod7",
    name: "Advanced Reports",
    description: "Detailed analytics and forecasting tools",
    icon: "BarChart3",
    enabled: true,
    license: "active",
    category: "analytics",
  },
  {
    id: "mod8",
    name: "Staff Scheduling",
    description: "Shift planning and labor cost optimization",
    icon: "Calendar",
    enabled: false,
    license: "trial",
    category: "operations",
  },
];

// Mock Sales Data (Last 7 days)
export const mockSalesData: SalesData[] = [
  {
    date: "2025-01-11",
    sales: 1250.5,
    transactions: 45,
    avgTicket: 27.79,
    totalSales: 1250.5,
    averageOrder: 27.79,
  },
  {
    date: "2025-01-12",
    sales: 1890.25,
    transactions: 62,
    avgTicket: 30.49,
    totalSales: 1890.25,
    averageOrder: 30.49,
  },
  {
    date: "2025-01-13",
    sales: 1456.0,
    transactions: 51,
    avgTicket: 28.55,
    totalSales: 1456.0,
    averageOrder: 28.55,
  },
  {
    date: "2025-01-14",
    sales: 1678.75,
    transactions: 58,
    avgTicket: 28.94,
    totalSales: 1678.75,
    averageOrder: 28.94,
  },
  {
    date: "2025-01-15",
    sales: 2150.0,
    transactions: 73,
    avgTicket: 29.45,
    totalSales: 2150.0,
    averageOrder: 29.45,
  },
  {
    date: "2025-01-16",
    sales: 1945.5,
    transactions: 67,
    avgTicket: 29.03,
    totalSales: 1945.5,
    averageOrder: 29.03,
  },
  {
    date: "2025-01-17",
    sales: 1320.0,
    transactions: 48,
    avgTicket: 27.5,
    totalSales: 1320.0,
    averageOrder: 27.5,
  },
];

// Mock Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  todaySales: 1320.0,
  todayTransactions: 48,
  activeStaff: 4,
  openIssues: 2,
  salesTrend: 8.5,
  topProducts: [
    { name: "Cappuccino", sales: 156 },
    { name: "Latte", sales: 142 },
    { name: "Croissant", sales: 98 },
    { name: "Cold Brew", sales: 87 },
    { name: "Club Sandwich", sales: 65 },
  ],
};

// Generate random ID
export const generateId = () => Math.random().toString(36).substr(2, 9);

// Format currency — thin wrapper delegating to the canonical formatter.
// Preserves the legacy USD/en-US defaults. Prefer importing from `@/lib/format`.
export const formatCurrency = (amount: number): string =>
  formatCurrencyCanonical(amount, "USD", "en-US");

// Format date — thin wrapper delegating to the canonical formatter.
// The canonical "medium" date style matches the legacy MMM D, YYYY pattern.
// Prefer importing from `@/lib/format`.
export const formatDate = (dateString: string): string =>
  formatDateCanonical(dateString, "medium");

// Format time — no canonical equivalent (time-only); retained during migration.
export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Calculate time elapsed
export const timeElapsed = (dateString: string): string => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// ============================================================
// MOCK IDENTITY DATA - For Identity Module (Login, Roles, Session)
// ============================================================

// Mock Roles
export const mockRoles: Record<string, Role> = {
  admin: {
    id: "role1",
    name: "Administrator",
    organizationId: "org1",
    description: "Full system admin role",
    isSystem: true,
    permissions: [
      {
        resource: "*",
        actions: ["create", "read", "update", "delete", "manage"],
      },
    ],
    moduleAccess: [
      { moduleId: "mod1", pages: ["dashboard", "settings"], features: [] },
      { moduleId: "mod2", pages: ["orders", "menu"], features: [] },
      { moduleId: "mod3", pages: ["inventory"], features: [] },
      { moduleId: "mod7", pages: ["analytics"], features: [] },
    ],
  },
  cashier: {
    id: "role2",
    name: "Cashier",
    organizationId: "org1",
    description: "Cashier with limited access",
    isSystem: false,
    permissions: [{ resource: "sales", actions: ["read", "manage"] }],
    moduleAccess: [
      { moduleId: "mod1", pages: ["pos"], features: [] },
      { moduleId: "mod2", pages: ["pos"], features: [] },
    ],
  },
  server: {
    id: "role3",
    name: "Server",
    organizationId: "org1",
    description: "Server role",
    isSystem: false,
    permissions: [{ resource: "orders", actions: ["read", "manage"] }],
    moduleAccess: [{ moduleId: "mod2", pages: ["orders"], features: [] }],
  },
};

// Mock Users
export const mockUsers: Record<
  string,
  { user: User; password: string; targetModule: "retail" | "cafe" }
> = {
  "admin@example.com": {
    user: {
      id: "u1",
      organizationId: "org1",
      email: "admin@example.com",
      name: "Admin User",
      status: "active",
      roleIds: ["role1"],
      roles: ["admin"],
      siteIds: ["site1"],
      createdAt: new Date().toISOString(),
    },
    password: "admin123",
    targetModule: "retail",
  },
  "cashier@example.com": {
    user: {
      id: "u2",
      organizationId: "org1",
      email: "cashier@example.com",
      name: "Cashier User",
      status: "active",
      roleIds: ["role2"],
      roles: ["admin"],
      siteIds: ["site1"],
      createdAt: new Date().toISOString(),
    },
    password: "cashier123",
    targetModule: "retail",
  },
  "server@example.com": {
    user: {
      id: "u3",
      organizationId: "org1",
      email: "server@example.com",
      name: "Server User",
      status: "active",
      roleIds: ["role3"],
      roles: ["admin"],
      siteIds: ["site1"],
      createdAt: new Date().toISOString(),
    },
    password: "server123",
    targetModule: "cafe",
  },
};

// Mock Organization
export const mockOrganizations: Organization[] = [
  {
    id: "org1",
    name: "Core Only Inc.",
    legalName: "Core Only Incorporated",
    taxId: "TAX-CORE-001",
    status: "active",
    createdAt: new Date().toISOString(),
    settings: {
      timezone: "UTC+0",
      currency: "USD",
      dateFormat: "YYYY-MM-DD",
      language: "en-US",
    },
  },
  {
    id: "org2",
    name: "Cafe Plus Inc.",
    legalName: "Cafe Plus Incorporated",
    taxId: "TAX-CAFE-002",
    status: "active",
    createdAt: new Date().toISOString(),
    settings: {
      timezone: "UTC+7",
      currency: "IDR",
      dateFormat: "DD/MM/YYYY",
      language: "id-ID",
    },
  },
  {
    id: "org3",
    name: "Retail Plus Inc.",
    legalName: "Retail Plus Incorporated",
    taxId: "TAX-RETAIL-003",
    status: "active",
    createdAt: new Date().toISOString(),
    settings: {
      timezone: "UTC+7",
      currency: "IDR",
      dateFormat: "DD/MM/YYYY",
      language: "id-ID",
    },
  },
  {
    id: "org4",
    name: "Full Stack Inc.",
    legalName: "Full Stack Incorporated",
    taxId: "TAX-FULL-004",
    status: "active",
    createdAt: new Date().toISOString(),
    settings: {
      timezone: "UTC+7",
      currency: "IDR",
      dateFormat: "DD/MM/YYYY",
      language: "id-ID",
    },
  },
];

// Mock Site
export const mockSites: Site[] = [
  {
    id: "site1",
    organizationId: "org1",
    name: "Core HQ",
    type: "headquarters",
    address: {
      street: "123 Core Street",
      city: "Metropolis",
      state: "State A",
      postalCode: "10001",
      country: "Country X",
    },
    phone: "+1-555-0001",
    email: "hq@coreonly.com",
    isMain: true,
    status: "active",
  },
  {
    id: "site2",
    organizationId: "org2",
    name: "Cafe Plus HQ",
    type: "restaurant",
    address: {
      street: "456 Cafe Avenue",
      city: "Jakarta",
      state: "DKI Jakarta",
      postalCode: "10110",
      country: "Indonesia",
    },
    phone: "+62-21-555-0102",
    email: "hq@cafeplus.com",
    isMain: true,
    status: "active",
  },
  {
    id: "site3",
    organizationId: "org3",
    name: "Retail Plus HQ",
    type: "store",
    address: {
      street: "789 Retail Road",
      city: "Jakarta",
      state: "DKI Jakarta",
      postalCode: "10220",
      country: "Indonesia",
    },
    phone: "+62-21-555-0203",
    email: "hq@retailplus.com",
    isMain: true,
    status: "active",
  },
  {
    id: "site4",
    organizationId: "org4",
    name: "Full Stack HQ",
    type: "headquarters",
    address: {
      street: "101 FullStack Blvd",
      city: "Jakarta",
      state: "DKI Jakarta",
      postalCode: "10330",
      country: "Indonesia",
    },
    phone: "+62-21-555-0304",
    email: "hq@fullstack.com",
    isMain: true,
    status: "active",
  },
];

// Mock Active Modules for session
export const mockActiveModules: Module[] = [
  {
    id: "mod1",
    name: "POS Retail",
    description: "",
    icon: "ShoppingCart",
    enabled: true,
    license: "active",
    category: "pos",
  },
  {
    id: "mod2",
    name: "POS Cafe",
    description: "",
    icon: "Coffee",
    enabled: true,
    license: "active",
    category: "pos",
  },
  {
    id: "mod3",
    name: "Inventory",
    description: "",
    icon: "Package",
    enabled: true,
    license: "trial",
    category: "operations",
  },
];

// Mock Licenses for session
export const mockLicenses: Record<
  string,
  { moduleId: string; type: "active" | "trial" | "expired" }
> = {
  mod1: { moduleId: "mod1", type: "active" },
  mod2: { moduleId: "mod2", type: "active" },
  mod3: { moduleId: "mod3", type: "trial" },
};
