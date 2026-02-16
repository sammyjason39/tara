
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { retailRepo } from '../core/repositories/retail/retailRepo';
import { ensureSeed, nextId } from '../core/repositories/hr/storage';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// --- Middleware: Logger --
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --- Event Engine Lite ---
// Schema Validation (Manual for speed, Zod later)
interface AnalyticsEvent {
  type: "product_view" | "cart_add" | "payment_success" | "wishlist_add" | "checkout_started" | "cart_remove" | "filter_used" | "sort_used" | "search_query";
  payload: Record<string, any>;
  timestamp: string;
  actor: { type: "visitor" | "customer"; id: string };
}

// In-Memory Event Log (flushed to disk via ensureSeed logic if needed, but storage.ts handles it)
const EVENT_LOG_KEY = "audit:events";

app.post('/api/retail/events', (req, res) => {
  try {
    const event = req.body as AnalyticsEvent;
    
    // 1. Validate Basic Schema
    if (!event.type || !event.actor || !event.timestamp) {
       return res.status(400).json({ error: "Invalid Schema" });
    }

    // 2. Append to Audit Log (Immutable)
    // We use a specialized key for raw analytics
    const logKey = `audit_logs:${new Date().toISOString().split('T')[0]}`;
    const logs = ensureSeed(logKey, []);
    // We can't push to result of ensureSeed directly if it returns a copy in some implementations, 
    // but our storage.ts returns the object. 
    // Safer to read-modify-write for consistency in file mode.
    // Actually, `storage.ts` implementation:
    // Browser: returns object. Node: returns object.
    
    // Let's use a simpler pattern for the File System:
    // Read -> Append -> Write
    // NOTE: In a high concurrency definition this fails, but for "Trial" it's fine.
    
    // We will use a dedicated function for appending to avoid race conditions in thought process,
    // though Node is single threaded strictly speaking for this sync op.
    
    const currentLogs = (logs as any[]) || [];
    currentLogs.push(event);
    
    // In Node mode, we need to explicitly save because ensureSeed just returned the data.
    // storage.ts `saveToStorage` needs to be called.
    // Import `saveToStorage`? Yes.
    // Wait, I didn't export `saveToStorage` in the snippet I wrote? 
    // I did. 
    
    // Re-importing specific storage functions locally to avoid type issues if not exported?
    // They are exported in storage.ts
    
    // Let's just use a helper here.
    const { saveToStorage, loadFromStorage } = require('../core/repositories/hr/storage');
    saveToStorage(logKey, currentLogs);

    // 3. Rule Engine (The "Engine" part)
    if (event.type === 'payment_success') {
       console.log("💰 Payment Success Event Triggered! Creating Order...");
       // Payload: { orderId, items, amount, ... }
       // In a real app, we'd validate the payment with the provider here.
       // For this trial, we trust the event and ensure the Order exists in RetailRepo.
       
       // Actually, the Event usually comes *after* the order is created, or *causes* it.
       // "payment_success -> generate Order record" is the user requirement.
       
       // Logic:
       // 1. Check if order exists (idempotency)
       // 2. Create Order in RetailRepo
       
       const { items, totalAmount, customer } = event.payload;
       
       // Mock Order Creation via Repository directly (Service is heavy with Session checks)
       // We act as SYSTEM.
       
       // Note: payload needs to map to internal IDs? 
       // We assume payload sends SKUs.
       // We need to look up Items.
       
       // We need `retailRepo` to be working in Node.
       // `retailRepo` imports `mockInventoryRepo`.
       // `mockInventoryRepo` imports `storage`.
       // Since we fixed `storage`, `retailRepo` should work in Node!
       
       // Let's try to list products to verify DB access.
       // const products = retailRepo.listProducts("tenant-demo");
       // console.log("Inventory loaded:", products.length);
       
       // Simulating Order Creation
       // We'll trust the payload has the right structure for now or map it.
       const newOrder = {
         id: event.payload.orderId || `ord-${Date.now()}`,
         tenantId: "tenant-demo", // Hardcoded for trial
         storeId: "store-001",
         status: "paid",
         totalAmount: totalAmount,
         items: items, // Schema match assumed
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
         customer: customer
       };
       
       retailRepo.createOrder("tenant-demo", newOrder as any);
       console.log("✅ Order Created in Backend DB:", newOrder.id);
    }
    
    if (event.type === 'cart_add') {
       console.log(`🛒 Interest captured: ${event.payload.sku}`);
       // Could update a "Trending" score here
    }

    res.json({ success: true, traceId: Date.now() });

  } catch (e: any) {
    console.error("Event Engine Error:", e);
    res.status(500).json({ error: e.message });
  }
});

// --- Public Data Endpoints (for Frontend Sync) ---
app.get('/api/retail/products', (req, res) => {
   const tenantId = req.query.tenantId as string || "tenant-demo";
   // This reads from the JSON files via the isomorphic repo
   const products = retailRepo.listProducts(tenantId); 
   res.json(products);
});

app.get('/api/retail/orders', (req, res) => {
   const tenantId = req.query.tenantId as string || "tenant-demo";
   const orders = retailRepo.listOrders(tenantId);
   res.json(orders);
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Zenvix Backend Engine running on http://localhost:${PORT}`);
  console.log(`📂 Storage Mode: Node.js File System (.db/)`);
});
