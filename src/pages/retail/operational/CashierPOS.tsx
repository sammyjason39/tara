import React, { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import { printerService } from "@/core/services/hardware/printerService";
import type { RetailShift, RetailProduct } from "@/core/types/retail/retail";
import {
  RefreshCw,
  LayoutGrid,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Printer as PrinterIcon,
  QrCode
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// POS Components
import { ScannerSearchHeader } from "./pos/ScannerSearchHeader";
import { ProductGrid } from "./pos/ProductGrid";
import { CartPanel } from "./pos/CartPanel";
import { CashPaymentModal } from "./pos/CashPaymentModal";
import { ElectronicPaymentModal } from "./pos/ElectronicPaymentModal";
import { paymentService } from "@/core/services/payment/paymentService";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  taxRate?: number;
  discount?: number;
}

const CashierPOS = () => {
  const session = useSession();
  const { activeStore } = useRetail();
  const { toast } = useToast();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [activeCategory, setActiveCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeShift, setActiveShift] = useState<RetailShift | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    window.crypto.randomUUID?.() || Math.random().toString(36).substring(2),
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [activePaymentModal, setActivePaymentModal] = useState<
    "none" | "cash" | "electronic"
  >("none");
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [cartTaxRate, setCartTaxRate] = useState(0);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [modifierTax, setModifierTax] = useState("0");
  const [modifierDiscount, setModifierDiscount] = useState("0");
  const [modifierReason, setModifierReason] = useState("");
  const [cartNotes, setCartNotes] = useState("");

  // Post-Transaction State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const PAGE_SIZE = 20;

  const toastRef = React.useRef(toast);
  React.useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Fetches products for the given category (or all if null).
  // Always passes a large pageSize so the backend doesn't truncate the result.
  const fetchProducts = React.useCallback(
    async (categoryId?: string) => {
      if (!session.tenant_id) return;
      setIsProductsLoading(true);
      try {
        const prodData = await retailService.listInventory(
          session.tenant_id,
          session,
          {
            locationId: session.location_id,
            categoryId,
            pageSize: 2000, // Ensure we get all items, not just the 20-item default
          },
        );
        setProducts(prodData);
      } catch (error) {
        console.error("Failed to fetch products", error);
        toastRef.current({
          title: "Inventory Error",
          description: "Could not load product catalog.",
          variant: "destructive",
        });
      } finally {
        setIsProductsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session.tenant_id, session.user_id, session.location_id],
  );

  useEffect(() => {
    const init = async () => {
      if (!session.tenant_id) return;
      try {
        setIsLoading(true);
        const [catData, shifts] = await Promise.all([
          retailService.listCategories(session.tenant_id, session),
          retailService.listShifts(
            session.tenant_id,
            session,
            session.location_id,
          ),
        ]);
        setCategories(catData);
        const openShift = shifts.find(
          (s) => s.status === "open" && s.employeeId === session.user_id,
        );
        setActiveShift(openShift || null);
        // Fetch products without a category filter (all items)
        await fetchProducts();
      } catch (error) {
        console.error("Failed to initialize POS", error);
        toastRef.current({
          title: "Init Failed",
          description: "Connection error.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.tenant_id, session.user_id, session.location_id]);

  // When the user changes category, re-fetch from the server with the correct filter
  useEffect(() => {
    fetchProducts(activeCategory?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  useEffect(() => {
    if (activeStore?.operationalConfig?.tax_rate !== undefined) {
      setCartTaxRate(activeStore.operationalConfig.tax_rate / 100);
    }
  }, [activeStore]);

  const addToCart = React.useCallback((product: RetailProduct) => {
    setSelectedItemId(product.id);
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
          taxRate: product.taxRate || 0,
          discount: 0,
        },
      ];
    });
  }, []);

  useEffect(() => {
    if (barcodeValue.length >= 8) {
      const product = products.find(
        (p) => p.sku === barcodeValue || p.barcode === barcodeValue,
      );
      if (product) {
        addToCart(product);
        setBarcodeValue("");
        toastRef.current({
          title: "Item Scanned",
          description: `${product.name} added.`,
        });
      }
    }
  }, [barcodeValue, products, addToCart]);

  // Products are already server-filtered by categoryId; we only need local text search
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    );
  }, [products, searchTerm]);

  // Reset to page 1 whenever the visible set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProducts]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
  const pagedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

  const handleCheckout = (method: "cash" | "card") => {
    setActivePaymentModal(method === "card" ? "electronic" : "cash");
  };

  // Calculate Totals dynamically
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemDiscount = cart.reduce((sum, item) => sum + (item.discount || 0) * item.quantity, 0);
  const effectiveSubtotal = Math.max(0, subtotal - totalItemDiscount - cartDiscount);
  const tax = cartTaxRate > 0 
    ? effectiveSubtotal * (cartTaxRate / 100) 
    : cart.reduce((sum, item) => {
        const itemSub = (item.price - (item.discount || 0)) * item.quantity;
        return sum + (itemSub * (item.taxRate || 0));
      }, 0);
  const grandTotal = effectiveSubtotal + tax;

  const finalizeTransaction = async (
    method: string,
    receivedAmount?: number,
    channel?: string,
    notes?: string,
    overrideReason?: string,
  ) => {
    if (cart.length === 0 || !session.tenant_id) return;

    if (!activeStore?.id) {
      toast({
        title: "Store Context Missing",
        description: "Please select a store to proceed.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const paymentMethodMap: Record<
        string,
        "cash" | "card" | "qr" | "wallet"
      > = {
        CASH: "cash",
        CARD: "card",
        QRIS: "qr",
        WALLET: "wallet",
      };

      const finalNotes = overrideReason 
        ? `${notes || ""}\n[COMPLIANCE OVERRIDE REASON]: ${overrideReason}`
        : notes;

      // Atomic Backend Checkout with Idempotency
      const order = await retailService.checkout(
        session.tenant_id,
        session,
        {
          store_id: activeStore.id,
          terminal_id: "terminal-pos",
          items: cart.map((item) => ({
            product_id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            discount: item.discount,
            taxRate: item.taxRate,
          })),
          payment_method: paymentMethodMap[method] || "cash",
          payment_received: receivedAmount || grandTotal,
          grand_total: grandTotal,
          shift_id: activeShift?.id || undefined,
          payment_channel: channel,
          notes: finalNotes,
        },
        idempotencyKey,
      );

      // Generate and Print Receipt
      const receiptPayload = {
        storeName: activeStore.name,
        storeAddress: activeStore.locationId || "Main Branch",
        orderId: order.id,
        date: new Date().toLocaleString(),
        cashier: session.fullName || session.user_id,
        items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal,
        tax,
        discount: cartDiscount,
        grandTotal,
        paymentMethod: method,
        receivedAmount: receivedAmount,
        changeAmount: receivedAmount ? receivedAmount - grandTotal : 0,
        notes: finalNotes
      };

      setLastTransaction(receiptPayload);
      setIsSuccessModalOpen(true);

      setCart([]);
      setCartNotes("");
      setModifierReason("");
      setActivePaymentModal("none");
      
      // Generate new key for the next unique transaction
      setIdempotencyKey(
        window.crypto.randomUUID?.() || Math.random().toString(36).substring(2),
      );

      try {
        await printerService.printReceipt(session.tenant_id, session, receiptPayload);
      } catch (printErr) {
        console.warn("Printing failed but transaction was saved:", printErr);
      }

      setCart([]);
      console.error("Checkout Error:", error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "Internal Error.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 font-black italic uppercase tracking-[0.25em]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-indigo-500/20 blur-[150px] rounded-full animate-pulse" />
        </div>
        <RefreshCw className="w-16 h-16 mb-8 animate-spin text-indigo-500 relative z-10" />
        <span className="relative z-10 text-white">Syncing POS Environment...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-slate-900 relative flex selection:bg-indigo-500 selection:text-white">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-indigo-500/10 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* Main Container: Full height, flex row */}
      <div className="flex flex-1 w-full gap-5 px-8 py-8 overflow-hidden relative z-10">
        {/* LEFT PLANE: Includes Controls + Inventory */}
        <div className="flex-[2.8] flex flex-col gap-6 overflow-hidden min-h-0">
          
          {/* TACTICAL HEADER */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <LayoutGrid className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                  Terminal POS
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-1">
                  Node: {session.location_id || "LOCAL_VAULT"} • v2.4.0
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {activeShift && (
                <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black italic uppercase text-emerald-500 tracking-widest">
                    Shift Active: {activeShift.id.slice(-6).toUpperCase()}
                  </span>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchProducts(activeCategory?.id)}
                className="h-10 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 font-black italic uppercase text-[10px] tracking-widest gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProductsLoading ? 'animate-spin' : ''}`} /> Sync Catalog
              </Button>
            </div>
          </div>

          {/* IN-PLANE COMMAND BAR (Scan, Search, Filter) */}
          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-2xl p-4 rounded-[2rem] border border-white/10 shadow-2xl shrink-0">
            <div className="flex-1">
              <ScannerSearchHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                barcodeValue={barcodeValue}
                onBarcodeChange={setBarcodeValue}
              />
            </div>

            <div className="h-10 w-px bg-white/10" />

            {/* Touch-Friendly Category Selector */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl min-w-[240px] h-14 transition-all hover:border-indigo-500/50">
              <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
              <select
                className="flex-1 bg-transparent text-[11px] font-black uppercase tracking-widest outline-none text-white cursor-pointer h-full appearance-none"
                value={activeCategory?.id || ""}
                onChange={(e) => {
                  const cat = categories.find((c) => c.id === e.target.value);
                  setActiveCategory(cat || null);
                }}
              >
                <option value="" className="bg-slate-900">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-slate-900">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button - touch-friendly */}
            <button
              onClick={() => {
                setActiveCategory(null);
                setSearchTerm("");
              }}
              title="Show all products"
              className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${
                !activeCategory && !searchTerm
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              <LayoutGrid className="w-6 h-6" />
            </button>
          </div>

          {/* Section Label — always visible, never scrolls */}
          <div className="flex items-center gap-4 shrink-0 px-2">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic flex items-center gap-3">
              {isProductsLoading && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              )}
              {searchTerm
                ? "SEARCH DATASET"
                : activeCategory
                  ? activeCategory.name
                  : "ROOT INVENTORY"}
              {!isProductsLoading && (
                <span className="text-indigo-500">
                  [{filteredProducts.length} ASSETS]
                </span>
              )}
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* Product Grid — this is the only scrollable area */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2 custom-scrollbar">
            {isProductsLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                <div className="w-16 h-16 rounded-full border-t-2 border-indigo-500 animate-spin" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em]">
                  Hydrating Catalog...
                </p>
              </div>
            ) : (
              <ProductGrid products={pagedProducts} onAddToCart={addToCart} />
            )}
          </div>

          {/* Pagination Bar — always visible, pinned to bottom of left pane */}
          <div className="shrink-0 bg-white/5 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 shadow-2xl px-6 py-4 flex items-center justify-between">
            {/* Range Label */}
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic">
              {filteredProducts.length === 0
                ? "No entries found"
                : `Range: ${(currentPage - 1) * PAGE_SIZE + 1} – ${Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} / ${filteredProducts.length}`}
            </span>

            {/* Page Pills + Prev/Next */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isProductsLoading}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-20 transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                {(() => {
                  const window = 1;
                  const start = Math.max(1, currentPage - window);
                  const end = Math.min(totalPages, currentPage + window);
                  const pages = [];
                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all active:scale-95 ${
                          i === currentPage
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                            : "bg-white/5 border border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        {i}
                      </button>,
                    );
                  }
                  return pages;
                })()}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || isProductsLoading}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 disabled:opacity-20 transition-all active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PLANE: Cart Panel */}
        <div className="flex-[1.2] min-w-[420px] h-full overflow-hidden">
          <CartPanel
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
            isProcessing={isProcessing}
            activeStoreName={activeStore?.name}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            cartTaxRate={cartTaxRate}
            cartDiscount={cartDiscount}
            onOpenModifiers={() => {
              setModifierTax(cartTaxRate.toString());
              setModifierDiscount(cartDiscount.toString());
              setModifierReason("");
              setIsModifierModalOpen(true);
            }}
            totals={{ subtotal, totalItemDiscount, cartDiscount, tax, grandTotal }}
          />
        </div>
      </div>

      <CashPaymentModal
        isOpen={activePaymentModal === "cash"}
        onClose={() => setActivePaymentModal("none")}
        total={grandTotal}
        onConfirm={(received, notes) => finalizeTransaction("CASH", received, undefined, notes, modifierReason)}
      />

      <ElectronicPaymentModal
        isOpen={activePaymentModal === "electronic"}
        onClose={() => setActivePaymentModal("none")}
        total={grandTotal}
        isProcessing={isProcessing}
        onConfirm={(method, channel, notes) =>
          finalizeTransaction(method, undefined, channel, notes, modifierReason)
        }
      />

      <Dialog open={isModifierModalOpen} onOpenChange={setIsModifierModalOpen}>
        {/* ... existing modifier content ... */}
      </Dialog>

      {/* TRANSACTION SUCCESS MODAL - Thermal Preview */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-white/10 p-0 overflow-hidden rounded-[2rem]">
          <div className="p-8 bg-indigo-600 flex flex-col items-center text-center gap-4">
             <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-xl animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-white" />
             </div>
             <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Payment Received</h2>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Order Synchronized to Vault</p>
             </div>
          </div>

          <div className="p-8 bg-slate-950 flex flex-col items-center">
             <div className="w-full bg-white p-6 shadow-2xl space-y-4 font-mono text-[10px] text-black leading-tight uppercase relative mb-8">
                <div className="text-center space-y-1 py-2">
                   <p className="text-xs font-bold tracking-tighter">{lastTransaction?.storeName}</p>
                   <p className="text-[8px]">{lastTransaction?.storeAddress}</p>
                </div>
                <div className="py-2 border-y border-dashed border-slate-300 space-y-0.5 text-[8px]">
                   <div className="flex justify-between"><span>ORDER:</span><span>#{lastTransaction?.orderId?.slice(-8).toUpperCase()}</span></div>
                   <div className="flex justify-between"><span>DATE:</span><span>{lastTransaction?.date}</span></div>
                   <div className="flex justify-between"><span>CASHIER:</span><span>{lastTransaction?.cashier}</span></div>
                </div>
                <div className="py-2 space-y-1">
                   {lastTransaction?.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between">
                         <span>{item.quantity}x {item.name}</span>
                         <span>{formatCurrency(item.total)}</span>
                      </div>
                   ))}
                </div>
                <div className="py-2 border-t border-dashed border-slate-300 space-y-1 font-bold">
                   <div className="flex justify-between"><span>TOTAL</span><span>{formatCurrency(lastTransaction?.grandTotal)}</span></div>
                   <div className="flex justify-between text-indigo-600"><span>METHOD</span><span>{lastTransaction?.paymentMethod}</span></div>
                </div>
                {lastTransaction?.changeAmount > 0 && (
                   <div className="p-3 bg-emerald-50 rounded-lg flex justify-between items-center text-emerald-600">
                      <span className="font-black">CHANGE DUE:</span>
                      <span className="text-sm font-black tracking-tighter">{formatCurrency(lastTransaction.changeAmount)}</span>
                   </div>
                )}
             </div>

             <div className="w-full grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12 rounded-xl bg-white/5 border-white/10 text-white font-black italic uppercase text-[10px] tracking-widest gap-2" onClick={() => printerService.printReceipt(session.tenant_id, session, lastTransaction)}>
                   <PrinterIcon className="w-4 h-4" /> Reprint
                </Button>
                <Button className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black italic uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-indigo-600/20" onClick={() => setIsSuccessModalOpen(false)}>
                   Next Customer
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashierPOS;
