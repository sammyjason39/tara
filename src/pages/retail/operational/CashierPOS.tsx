import React, { useState, useMemo, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import type { RetailShift, RetailProduct } from "@/core/types/retail/retail";
import {
  RefreshCw,
  LayoutGrid,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  sku: string;
  price: number;
  quantity: number;
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
  const PAGE_SIZE = 20;

  const toastRef = React.useRef(toast);
  React.useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Fetches products for the given category (or all if null).
  // Always passes a large pageSize so the backend doesn't truncate the result.
  const fetchProducts = React.useCallback(
    async (categoryId?: string) => {
      if (!session.tenantId) return;
      setIsProductsLoading(true);
      try {
        const prodData = await retailService.listInventory(
          session.tenantId,
          session,
          {
            locationId: session.locationId,
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
    [session.tenantId, session.userId, session.locationId],
  );

  useEffect(() => {
    const init = async () => {
      if (!session.tenantId) return;
      try {
        setIsLoading(true);
        const [catData, shifts] = await Promise.all([
          retailService.listCategories(session.tenantId, session),
          retailService.listShifts(
            session.tenantId,
            session,
            session.locationId,
          ),
        ]);
        setCategories(catData);
        const openShift = shifts.find(
          (s) => s.status === "open" && s.employeeId === session.userId,
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
  }, [session.tenantId, session.userId, session.locationId]);

  // When the user changes category, re-fetch from the server with the correct filter
  useEffect(() => {
    fetchProducts(activeCategory?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

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

  const finalizeTransaction = async (
    method: "CASH" | "CARD" | "QRIS" | "WALLET",
    receivedAmount?: number,
    channel?: string,
  ) => {
    if (cart.length === 0 || !session.tenantId) return;

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
      const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const totalAmount = subtotal * 1.11; // subtotal + 11% tax

      const paymentMethodMap: Record<
        string,
        "cash" | "card" | "qr" | "wallet"
      > = {
        CASH: "cash",
        CARD: "card",
        QRIS: "qr",
        WALLET: "wallet",
      };

      // Atomic Backend Checkout with Idempotency
      const order = await retailService.checkout(
        session.tenantId,
        session,
        {
          store_id: activeStore.id,
          terminal_id: "terminal-pos",
          items: cart.map((item) => ({
            product_id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
          })),
          payment_method: paymentMethodMap[method] || "cash",
          payment_received: receivedAmount || totalAmount,
          grand_total: totalAmount,
          shift_id: activeShift?.id || undefined,
          payment_channel: channel,
        },
        idempotencyKey,
      );

      setCart([]);
      setActivePaymentModal("none");
      // Generate new key for the next unique transaction
      setIdempotencyKey(
        window.crypto.randomUUID?.() || Math.random().toString(36).substring(2),
      );

      toast({
        title: "Transaction Successful",
        description: `Order #${order.id.slice(-6).toUpperCase()} completed via ${method}.`,
      });
    } catch (error) {
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
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400 font-black italic uppercase tracking-[0.25em]">
        <RefreshCw className="w-12 h-12 mb-6 animate-spin text-blue-600" />
        Syncing POS Environment...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden bg-slate-50 relative flex">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-indigo-400/10 blur-[130px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-blue-400/10 blur-[120px] rounded-full animate-pulse" />
      </div>

      {/* Main Container: Full height, flex row */}
      <div className="flex flex-1 w-full gap-5 px-6 py-6 overflow-hidden relative z-10">
        {/* LEFT PLANE: Includes Controls + Inventory */}
        <div className="flex-[2.8] flex flex-col gap-3 overflow-hidden min-h-0">
          {/* IN-PLANE COMMAND BAR (Scan, Search, Filter) */}
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-xl p-3 rounded-2xl border border-white/60 shadow-sm shrink-0">
            <div className="flex-1">
              <ScannerSearchHeader
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                barcodeValue={barcodeValue}
                onBarcodeChange={setBarcodeValue}
              />
            </div>

            {/* Touch-Friendly Category Selector */}
            <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-slate-200 rounded-xl min-w-[220px] h-12 shadow-sm">
              <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
              <select
                className="flex-1 bg-transparent text-[11px] font-bold uppercase tracking-wider outline-none text-slate-700 cursor-pointer h-full"
                value={activeCategory?.id || ""}
                onChange={(e) => {
                  const cat = categories.find((c) => c.id === e.target.value);
                  setActiveCategory(cat || null);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
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
              className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all border shrink-0 ${
                !activeCategory && !searchTerm
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-slate-400 border-slate-200 hover:text-indigo-600 hover:border-indigo-300"
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>

          {/* Section Label — always visible, never scrolls */}
          <div className="flex items-center gap-4 shrink-0 px-1">
            <div className="h-px flex-1 bg-slate-200/60" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 italic flex items-center gap-2">
              {isProductsLoading && (
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
              )}
              {searchTerm
                ? "SEARCH DATASET"
                : activeCategory
                  ? activeCategory.name
                  : "ROOT INVENTORY"}
              {!isProductsLoading && (
                <span className="text-indigo-400">
                  ({filteredProducts.length})
                </span>
              )}
            </span>
            <div className="h-px flex-1 bg-slate-200/60" />
          </div>

          {/* Product Grid — this is the only scrollable area */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2">
            {isProductsLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Loading inventory...
                </p>
              </div>
            ) : (
              <ProductGrid products={pagedProducts} onAddToCart={addToCart} />
            )}
          </div>

          {/* Pagination Bar — always visible, pinned to bottom of left pane */}
          <div className="shrink-0 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm px-4 py-3 flex items-center justify-between">
            {/* Range Label */}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {filteredProducts.length === 0
                ? "No items"
                : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} of ${filteredProducts.length}`}
            </span>

            {/* Page Pills + Prev/Next */}
            <div className="flex items-center gap-1.5">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isProductsLoading}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page number pills — show up to 5 around current */}
              {(() => {
                const window = 2;
                const start = Math.max(1, currentPage - window);
                const end = Math.min(totalPages, currentPage + window);
                const pages = [];
                if (start > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => setCurrentPage(1)}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[12px] font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-95"
                    >
                      1
                    </button>,
                  );
                  if (start > 2)
                    pages.push(
                      <span
                        key="start-ellipsis"
                        className="text-slate-300 text-xs px-0.5"
                      >
                        …
                      </span>,
                    );
                }
                for (let i = start; i <= end; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-9 h-9 rounded-xl text-[12px] font-black transition-all active:scale-95 ${
                        i === currentPage
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                          : "bg-white border border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
                      }`}
                    >
                      {i}
                    </button>,
                  );
                }
                if (end < totalPages) {
                  if (end < totalPages - 1)
                    pages.push(
                      <span
                        key="end-ellipsis"
                        className="text-slate-300 text-xs px-0.5"
                      >
                        …
                      </span>,
                    );
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[12px] font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-95"
                    >
                      {totalPages}
                    </button>,
                  );
                }
                return pages;
              })()}

              {/* Next */}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || isProductsLoading}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PLANE: Cart Panel (Now starts at the same top as the controls) */}
        <div className="flex-[1.2] min-w-[380px] h-full overflow-hidden">
          <CartPanel
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onCheckout={handleCheckout}
            isProcessing={isProcessing}
            activeStoreName={activeStore?.name}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
          />
        </div>
      </div>

      {/* Payment Modals */}
      <CashPaymentModal
        isOpen={activePaymentModal === "cash"}
        onClose={() => setActivePaymentModal("none")}
        total={cart.reduce((s, i) => s + i.price * i.quantity, 0) * 1.11}
        onConfirm={(received) => finalizeTransaction("CASH", received)}
      />

      <ElectronicPaymentModal
        isOpen={activePaymentModal === "electronic"}
        onClose={() => setActivePaymentModal("none")}
        total={cart.reduce((s, i) => s + i.price * i.quantity, 0) * 1.11}
        isProcessing={isProcessing}
        onConfirm={(method, channel) =>
          finalizeTransaction(method, undefined, channel)
        }
      />
    </div>
  );
};

export default CashierPOS;
