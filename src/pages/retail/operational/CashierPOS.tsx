import React, { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  ShoppingCart,
  Search,
  CreditCard,
  Banknote,
  User,
  Package,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import { useSession } from "@/core/security/session";
import { useRetail } from "../context/RetailContext";
import type { RetailShift, RetailProduct } from "@/core/types/retail/retail";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

const CashierPOS = () => {
  const session = useSession();
  const { activeStore, activeChannel } = useRetail();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<RetailShift | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await retailService.listInventory(
          session.tenantId!,
          session,
        );
        setProducts(data);

        // Fetch active shift for current location
        const shifts = await retailService.listShifts(
          session.tenantId!,
          session,
          session.locationId,
        );
        const openShift = shifts.find(
          (s) => s.status === "open" && s.employeeId === session.userId,
        );
        setActiveShift(openShift || null);
      } catch (error) {
        console.error("Failed to fetch products or shift", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [session.tenantId, session.userId, session]);

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.includes(searchTerm),
    );
  }, [products, searchTerm]);

  const addToCart = (product: RetailProduct) => {
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
      ]; // Mock price if not in inventory
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const tax = subtotal * 0.11;
  const total = subtotal + tax;

  const handleCheckout = async (method: "cash" | "card") => {
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      // Create order via service
      const order = await retailService.createOrder(
        session.tenantId!,
        session,
        session.locationId || "unassigned",
        "terminal-global-pos",
        cart.map((item) => ({
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        activeShift?.id, // Add Shift ID
      );

      // Process payment
      await retailService.processPayment(
        session.tenantId!,
        session,
        order.id,
        total,
        method === "cash" ? "cash" : "card",
        activeShift?.id, // Add Shift ID
      );

      setLastOrder(order.id);
      setCart([]);
      toast({
        title: "Order Completed",
        description: `Order ${order.id} completed successfully via ${method}!`,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Checkout Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col space-y-2 overflow-hidden bg-slate-50">
      {/* 4.1 Zero-clutter execution mode — COMPACT V3 */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Product Catalog Plane */}
        <div className="flex-[2] flex flex-col space-y-4 overflow-hidden">
          <Card className="flex-shrink-0 shadow-sm border-blue-50">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  className="pl-12 h-12 text-lg border-blue-100 focus:ring-blue-500 rounded-xl font-bold italic"
                  placeholder="Scan barcode or search product..."
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <ScrollArea className="flex-1 rounded-[2rem] border bg-slate-50/50 p-4 shadow-inner">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-400 font-black italic uppercase tracking-[0.2em] animate-pulse">
                <RefreshCw className="w-10 h-10 mb-4 animate-spin" />
                Loading SKU Matrix...
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((p) => (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all active:scale-95 overflow-hidden group bg-white border-2 border-slate-100 rounded-2xl"
                    onClick={() => addToCart(p)}
                  >
                    <div className="aspect-square bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <Package className="w-10 h-10 text-slate-300 group-hover:text-blue-300 transition-colors" />
                    </div>
                    <CardContent className="p-4">
                      <div className="text-sm font-black text-slate-900 truncate italic">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-tighter">
                        SKU: {p.sku}
                      </div>
                      <div className="text-base font-black text-blue-600">
                        Rp 85,000
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Cart & Payment Plane */}
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden shadow-2xl border-slate-200 rounded-[2.5rem]">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/80 py-6 px-8">
              <CardTitle className="text-xl flex items-center gap-2 font-black italic text-slate-800 tracking-tighter uppercase">
                <ShoppingCart className="w-7 h-7 text-blue-600" />
                {activeStore?.name || activeChannel?.name || "Terminal Hub"}
              </CardTitle>
              <Badge className="bg-blue-600 text-white font-black italic px-4 py-1">
                {cart.length} SKUs
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden flex flex-col bg-white">
              <ScrollArea className="flex-1 p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                    <ShoppingCart className="w-16 h-16 mb-4 opacity-10" />
                    <p className="font-black italic uppercase text-xs tracking-widest text-slate-400">
                      Cart is Vacant
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 hover:bg-slate-50 p-3 rounded-2xl transition-colors group relative border border-transparent hover:border-slate-100 italic"
                      >
                        <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors shadow-inner">
                          <Package className="w-8 h-8 text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-slate-900 truncate tracking-tight">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase">
                            Rp {item.price.toLocaleString()} / Unit
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center border-2 border-slate-100 rounded-xl bg-white overflow-hidden shadow-sm">
                              <button
                                className="p-2 hover:bg-slate-50 text-slate-400 transition-colors active:bg-slate-100"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="px-4 text-xs font-black min-w-[2.5rem] text-center text-slate-900">
                                {item.quantity}
                              </span>
                              <button
                                className="p-2 hover:bg-slate-50 text-slate-400 transition-colors active:bg-slate-100"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 bg-slate-50 rounded-xl"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm font-black text-right text-slate-900 pt-1">
                          Rp {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-8 bg-slate-900 text-white space-y-6 rounded-t-[3rem] shadow-3xl">
                <div className="space-y-4 text-sm font-bold italic opacity-80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 uppercase tracking-widest text-[10px] font-black">
                      Subtotal
                    </span>
                    <span className="text-white">
                      Rp {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 uppercase tracking-widest text-[10px] font-black">
                      VAT (11%)
                    </span>
                    <span className="text-white">
                      Rp {tax.toLocaleString()}
                    </span>
                  </div>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex justify-between items-end pb-2">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">
                    Due Amount
                  </span>
                  <span className="text-4xl font-black italic tracking-tighter">
                    Rp {total.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="bg-transparent border-white/10 text-white hover:bg-white/5 h-20 text-lg font-black italic gap-3 rounded-2xl disabled:opacity-50"
                    disabled={cart.length === 0 || isProcessing}
                    onClick={() => handleCheckout("cash")}
                  >
                    <Banknote className="w-7 h-7" /> CASH
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-500 h-20 text-lg font-black italic gap-3 rounded-2xl shadow-2xl shadow-blue-900/40 disabled:opacity-50"
                    disabled={cart.length === 0 || isProcessing}
                    onClick={() => handleCheckout("card")}
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-7 h-7 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-7 h-7" /> P-GATEWAY
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-blue-200 transition-colors shadow-xl rounded-3xl overflow-hidden border-2 border-slate-100">
            <CardContent className="p-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-4 text-slate-600 font-black italic h-14 hover:bg-blue-50 hover:text-blue-600 transition-all group px-5"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-white shadow-inner">
                  <User className="w-5 h-5" />
                </div>
                ATTACH LOYALTY MEMBER
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CashierPOS;
