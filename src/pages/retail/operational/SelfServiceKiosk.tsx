import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  Scan,
  ShoppingBag,
  CreditCard,
  QrCode,
  ArrowRight,
  Trash2,
  Minus,
  Plus,
  Info,
  ShieldCheck,
  Monitor,
  Sparkles,
  X,
  CheckCircle,
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
import type { RetailProduct } from "@/core/types/retail/retail";

interface CartItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
}

const SelfServiceKiosk = () => {
  const session = useSession();
  const { activeStore, activeChannel } = useRetail();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"scanning" | "payment" | "success">(
    "scanning",
  );
  const [paymentMethod, setPaymentMethod] = useState<"card" | "qr" | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await retailService.listInventory(
          session.tenantId,
          session,
        );
        setProducts(data);
      } catch (error: unknown) {
        console.error("Failed to fetch products", error);
      }
    };
    fetchData();
  }, [session.tenantId, session]);

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
          sku: product.sku,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
    toast({
      title: "Item Added",
      description: `${product.name} added to tray.`,
    });
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput) return;
    const product = products.find(
      (p) => p.sku === scanInput || p.id === scanInput,
    );
    if (product) {
      addToCart(product);
    } else {
      toast({
        title: "Scan Error",
        description: "Product unknown. Please try again.",
        variant: "destructive",
      });
    }
    setScanInput("");
    inputRef.current?.focus();
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    window.crypto.randomUUID?.() || Math.random().toString(36).substring(2),
  );

  const handleCheckout = async () => {
    if (cart.length === 0 || !session.tenantId) return;

    if (!activeStore?.id) {
      toast({
        title: "Store Context Missing",
        description: "Terminal not bound to a physical location.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Atomic Backend Checkout with Idempotency
      await retailService.checkout(
        session.tenantId,
        session,
        {
          store_id: activeStore.id,
          terminal_id: "kiosk-self-terminal-01",
          items: cart.map((item) => ({
            product_id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
          })),
          payment_method: paymentMethod || "card",
          payment_received: total,
          grand_total: total,
          payment_channel: paymentMethod === "qr" ? "QR" : "CARD_POS",
        },
        idempotencyKey,
      );

      setStep("success");
      setCart([]);
      setIdempotencyKey(
        window.crypto.randomUUID?.() || Math.random().toString(36).substring(2),
      );
    } catch (error: unknown) {
      console.error("Checkout Error:", error);
      const message = error instanceof Error ? error.message : "Payment failed";
      toast({
        title: "Transaction Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20">
          <CheckCircle className="w-16 h-16 text-emerald-600 animate-bounce" />
        </div>
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-black italic tracking-tighter text-slate-900 uppercase">
            Payment Received!
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
            Please take your receipt and items below.
          </p>
        </div>
        <Button
          className="h-20 px-12 bg-slate-900 hover:bg-slate-800 text-white font-black italic rounded-[2rem] text-xl uppercase tracking-widest transition-all"
          onClick={() => setStep("scanning")}
        >
          New Customer
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-2 overflow-hidden bg-slate-50">
      <WorkspacePanel className="flex-1 overflow-auto rounded-[2rem]">
        {/* Kiosk Header Area - Compact */}
        <div className="flex justify-between items-center bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-100 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">
                {activeStore?.name || activeChannel?.name || "Zenvix Kiosk V2"}
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 italic">
                Station ID: KIOSK-SELF-{session.locationId} • Secured by Zenvix
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5 italic">
                System Integrity
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black italic uppercase">
                  PCI_DSS: ACTIVE
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-all"
              onClick={() =>
                toast({
                  title: "Kiosk Support",
                  description: `Terminal ID: KIOSK-SELF-${session.locationId}. Please see the floor supervisor for manual assistance.`,
                })
              }
            >
              <Info className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Scanning & Selection */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-3xl bg-white rounded-[3rem] overflow-hidden">
              <CardHeader className="p-10 pb-0">
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Guest Input Module
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 pt-6">
                <form onSubmit={handleScan} className="relative group">
                  <Scan className="absolute left-8 top-1/2 -translate-y-1/2 w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
                  <Input
                    ref={inputRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="SCAN BARCODE HERE..."
                    className="h-28 pl-24 pr-12 text-3xl font-black bg-slate-50/50 border-4 border-slate-100 focus:border-blue-600 focus:ring-0 rounded-[2rem] shadow-inner uppercase tracking-widest italic transition-all"
                    autoFocus
                  />
                </form>

                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {products.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-6 bg-white border-2 border-slate-50 rounded-3xl hover:border-blue-500 hover:shadow-2xl transition-all group"
                    >
                      <div className="w-full aspect-square bg-slate-100 rounded-2xl mb-4 flex items-center justify-center shadow-inner group-hover:bg-blue-50 transition-colors">
                        <ShoppingBag className="w-10 h-10 text-slate-300 group-hover:text-blue-600 group-hover:scale-110 transition-all font-black" />
                      </div>
                      <div className="text-xs font-black italic text-slate-900 truncate uppercase">
                        {p.name}
                      </div>
                      <div className="text-[10px] font-bold text-blue-600 mt-1 italic">
                        Rp {p.price.toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden">
              <CardHeader className="p-10 border-b border-slate-50 bg-slate-50/20">
                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">
                  Your Selection Vault
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-20 text-slate-200">
                      <ShoppingBag className="w-24 h-24 mb-6 opacity-5" />
                      <p className="text-sm font-black italic uppercase tracking-[0.2em]">
                        Tray is Empty
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="p-8 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex gap-6">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center shadow-inner">
                              <ShoppingBag className="w-10 h-10 text-slate-400" />
                            </div>
                            <div className="flex flex-col justify-center">
                              <div className="text-xl font-black italic text-slate-900 uppercase tracking-tighter">
                                {item.name}
                              </div>
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
                                SKU: {item.sku}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-12">
                            <div className="flex items-center gap-4 bg-white border-2 border-slate-100 p-2 rounded-2xl shadow-sm">
                              <Button
                                variant="ghost"
                                className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 font-black"
                                onClick={() =>
                                  setCart((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id
                                        ? {
                                            ...i,
                                            quantity: Math.max(
                                              1,
                                              i.quantity - 1,
                                            ),
                                          }
                                        : i,
                                    ),
                                  )
                                }
                              >
                                <Minus className="w-5 h-5" />
                              </Button>
                              <div className="w-10 text-center text-xl font-black italic text-slate-900">
                                {item.quantity}
                              </div>
                              <Button
                                variant="ghost"
                                className="h-10 w-10 p-0 rounded-xl hover:bg-slate-100 font-black"
                                onClick={() =>
                                  setCart((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id
                                        ? { ...i, quantity: i.quantity + 1 }
                                        : i,
                                    ),
                                  )
                                }
                              >
                                <Plus className="w-5 h-5" />
                              </Button>
                            </div>
                            <div className="text-right min-w-[120px]">
                              <div className="text-2xl font-black italic text-slate-900 tracking-tighter">
                                Rp{" "}
                                {(item.price * item.quantity).toLocaleString()}
                              </div>
                              <button
                                onClick={() => {
                                  if (
                                    confirm("Clear all items from your tray?")
                                  ) {
                                    setCart([]);
                                    toast({
                                      title: "Tray Cleared",
                                      description:
                                        "All items have been removed.",
                                    });
                                  }
                                }}
                                className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors mt-1"
                              >
                                Remove Item
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Total & Final Checkout */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-3xl bg-slate-900 text-white rounded-[3rem] overflow-hidden sticky top-8">
              <CardContent className="p-10 space-y-10">
                <div className="space-y-4">
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] italic">
                    Consolidated Total
                  </div>
                  <div className="text-6xl font-black italic tracking-tighter text-white">
                    Rp {total.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3 py-4 border-y border-white/10">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Encrypted Transaction Context
                    </span>
                  </div>
                </div>

                {step === "scanning" ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setPaymentMethod("card")}
                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                          paymentMethod === "card"
                            ? "bg-blue-600 border-blue-400 shadow-2xl shadow-blue-500/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <CreditCard className="w-8 h-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">
                          Credit Card
                        </span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod("qr")}
                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                          paymentMethod === "qr"
                            ? "bg-amber-600 border-amber-400 shadow-2xl shadow-amber-500/50"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <QrCode className="w-8 h-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">
                          QR / E-Wallet
                        </span>
                      </button>
                    </div>

                    <Button
                      className="w-full h-24 bg-blue-600 hover:bg-blue-500 text-white font-black italic rounded-[2rem] text-xl shadow-2xl shadow-blue-500/40 uppercase tracking-[0.2em] transition-all disabled:opacity-20"
                      disabled={
                        cart.length === 0 || !paymentMethod || isProcessing
                      }
                      onClick={handleCheckout}
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-8 h-8 animate-spin" />
                      ) : (
                        <>
                          Pay Now{" "}
                          <ArrowRight className="w-8 h-8 ml-4 shrink-0" />
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-pulse">
                    <p className="text-center font-black italic text-sm text-blue-400 uppercase tracking-widest">
                      Awaiting Zenvix Verification...
                    </p>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-[60%] transition-all duration-[2s]" />
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    By paying, you agree to our{" "}
                    <span className="underline text-slate-400">
                      Digital Terms of Service
                    </span>
                    . Receipt will be generated automatically.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-100 shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
              <CardContent className="p-8 flex gap-5 items-center">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-slate-100">
                  <Monitor className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic leading-none mb-1">
                    Station Telemetry
                  </div>
                  <div className="text-sm font-black italic text-slate-900 uppercase tracking-tighter">
                    Thermal Printer: [OK]
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </WorkspacePanel>
    </div>
  );
};

export default SelfServiceKiosk;
