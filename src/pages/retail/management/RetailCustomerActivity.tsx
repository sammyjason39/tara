import { useState, useEffect, useMemo } from "react";
import {
  User,
  ShoppingCart,
  Heart,
  History,
  MessageSquare,
  Search,
  ChevronRight,
  Filter,
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  UserCheck,
} from "lucide-react";
import { useSession } from "@/core/security/session";
import { retailService } from "@/core/services/retail/retailService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function RetailCustomerActivity({ 
  onExpansionRequest 
}: { 
  onExpansionRequest?: (feature: string) => void 
}) {
  const session = useSession();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchCustomers = async () => {
    if (!session.tenantId) return;
    try {
      setLoading(true);
      const data = await retailService.listCustomers(session.tenantId, session);
      setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [session.tenantId]);

  const filteredCustomers = useMemo(() => {
    return (Array.isArray(customers) ? customers : []).filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );
  }, [customers, search]);

  const handleOpenDetail = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  return (
    <Card className="rounded-[4rem] border border-white/5 shadow-2xl bg-white/[0.03] backdrop-blur-3xl overflow-hidden group/registry">
      <CardHeader className="p-14 border-b border-white/5 bg-white/[0.01]">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
          <div className="space-y-4">
            <CardTitle className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-6 text-white italic">
              <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 group-hover/registry:rotate-6 transition-transform duration-500">
                <User className="w-8 h-8" />
              </div>
              Customer Registry
            </CardTitle>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] ml-[88px] italic">
              Unified activity tracking for registered ecommerce users • {customers.length} Identities
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-hover/search:text-indigo-400 transition-colors" />
              <Input
                placeholder="Search Identity..."
                className="pl-12 h-16 w-[350px] rounded-2xl border-white/10 bg-white/5 text-white font-black italic uppercase text-[11px] tracking-[0.2em] focus:ring-2 focus:ring-indigo-600/50 shadow-2xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="h-16 w-16 p-0 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 shadow-2xl"
              onClick={() => onExpansionRequest?.("Identity Registry Filter Matrix")}
            >
              <Filter className="w-5 h-5 text-slate-400" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-40 text-center space-y-6">
            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_50px_rgba(79,70,229,0.3)]" />
            <p className="text-sm font-black italic text-slate-500 uppercase tracking-[0.4em] animate-pulse">Synchronizing Registry...</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="group flex items-center justify-between p-10 hover:bg-white/[0.04] transition-all duration-500 cursor-pointer relative overflow-hidden"
                onClick={() => handleOpenDetail(customer)}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-indigo-400 text-2xl italic group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xl">
                    {customer.name[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black italic text-white group-hover:text-indigo-400 transition-colors tracking-tight">
                      {customer.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium tracking-tight mt-1">{customer.email || "No email"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-16 relative z-10">
                  <div className="hidden xl:flex items-center gap-12 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 italic">
                    <div className="space-y-2">
                      <p>Tier</p>
                      <Badge variant="outline" className="bg-white/5 rounded-lg px-3 h-6 border-white/10 text-white italic">
                        {customer.tier || "REGULAR"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p>Points</p>
                      <p className="text-white italic">{customer.points || 0}</p>
                    </div>
                    <div className="space-y-2">
                      <p>Compliance</p>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg px-3 h-6 gap-2">
                        <ShieldCheck className="w-3 h-3" /> VERIFIED
                      </Badge>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-indigo-600 transition-colors shadow-2xl">
                    <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CustomerDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        customer={selectedCustomer}
        onExpansionRequest={onExpansionRequest}
      />
    </Card>
  );
}

function CustomerDetailDialog({ isOpen, onOpenChange, customer, onExpansionRequest }: any) {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden border border-white/10 rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-slate-950">
        <DialogHeader className="sr-only">
          <DialogTitle>Customer Details - {customer.name}</DialogTitle>
        </DialogHeader>
        <div className="flex h-full">
          {/* Sidebar Info */}
          <div className="w-[350px] bg-white/[0.02] border-r border-white/5 p-12 space-y-12 overflow-y-auto custom-scrollbar">
            <div className="space-y-6 text-center">
              <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 mx-auto flex items-center justify-center text-5xl font-black italic shadow-[0_20px_50px_rgba(79,70,229,0.4)] text-white">
                {customer.name[0]}
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{customer.name}</h2>
                <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-[0.4em] italic">{customer.tier || "REGULAR"} Member</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Identity Payload</p>
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Email</p>
                     <p className="text-sm font-medium text-white truncate italic">{customer.email || "N/A"}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Phone</p>
                     <p className="text-sm font-medium text-white italic">{customer.phone || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Compliance Vault */}
              <div className="p-8 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/10 space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] italic">Compliance Vault</p>
                  <Lock className="w-4 h-4 text-rose-500" />
                </div>
                <div className="space-y-3">
                  <Button 
                    variant="outline"
                    className="w-full h-12 rounded-xl bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 gap-3"
                    onClick={() => onExpansionRequest?.(`GDPR Data Export: ${customer.name}`)}
                  >
                    <Download className="w-3.5 h-3.5" /> Export Data PII
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full h-12 rounded-xl bg-rose-500/10 border-rose-500/20 text-[9px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/20 gap-3"
                    onClick={() => onExpansionRequest?.(`Identity Anonymization: ${customer.name}`)}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Anonymize Identity
                  </Button>
                </div>
              </div>

              <div className="p-8 rounded-[2rem] bg-indigo-600/10 border border-indigo-600/20 text-center shadow-inner">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-2 italic">Loyalty Ledger</p>
                <p className="text-5xl font-black italic text-white tracking-tighter italic">{customer.points || 0}</p>
              </div>
            </div>

            <Button 
              onClick={() => onExpansionRequest?.(`Identity Modification: ${customer.name}`)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl h-16 text-[11px] font-black uppercase tracking-[0.3em] italic text-white shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              Edit Identity Registry
            </Button>
          </div>

          {/* Main Content Tabs */}
          <div className="flex-1 bg-transparent p-12 overflow-hidden flex flex-col">
            <Tabs defaultValue="history" className="h-full flex flex-col">
              <TabsList className="bg-white/5 p-2 rounded-[2rem] w-fit mb-12 h-20 border border-white/5 backdrop-blur-3xl shadow-2xl">
                <TabsTrigger value="history" className="rounded-2xl px-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[11px] font-black uppercase italic tracking-[0.3em] transition-all text-slate-500 h-full">
                  <History className="w-5 h-5 mr-3" /> History
                </TabsTrigger>
                <TabsTrigger value="cart" className="rounded-2xl px-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[11px] font-black uppercase italic tracking-[0.3em] transition-all text-slate-500 h-full">
                  <ShoppingCart className="w-5 h-5 mr-3" /> Cart
                </TabsTrigger>
                <TabsTrigger value="wishlist" className="rounded-2xl px-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[11px] font-black uppercase italic tracking-[0.3em] transition-all text-slate-500 h-full">
                  <Heart className="w-5 h-5 mr-3" /> Wishlist
                </TabsTrigger>
                <TabsTrigger value="chat" className="rounded-2xl px-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[11px] font-black uppercase italic tracking-[0.3em] transition-all text-slate-500 h-full">
                  <MessageSquare className="w-5 h-5 mr-3" /> Chat
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="history" className="h-full mt-0 focus-visible:ring-0">
                  <OrderHistoryList customerId={customer.id} />
                </TabsContent>
                <TabsContent value="cart" className="h-full mt-0 focus-visible:ring-0">
                  <CustomerCartView cart={customer.retail_carts} />
                </TabsContent>
                <TabsContent value="wishlist" className="h-full mt-0 focus-visible:ring-0">
                  <CustomerWishlistView wishlist={customer.retail_wishlists} onExpansionRequest={onExpansionRequest} />
                </TabsContent>
                <TabsContent value="chat" className="h-full mt-0 focus-visible:ring-0">
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-10 bg-white/[0.02] rounded-[3.5rem] border-2 border-dashed border-white/5 group/chat overflow-hidden relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.05)_0%,transparent_70%)] opacity-0 group-hover/chat:opacity-100 transition-opacity duration-1000" />
                    <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 shadow-3xl flex items-center justify-center group-hover/chat:scale-110 group-hover/chat:rotate-6 transition-all duration-500 relative z-10">
                      <MessageSquare className="w-10 h-10 text-indigo-400" />
                    </div>
                    <div className="space-y-6 relative z-10 max-w-md">
                      <div className="space-y-3">
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">WhatsApp Bridge</h3>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] italic">Establish secure real-time channel with {customer.name}</p>
                      </div>
                      <Button 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-20 px-14 text-[12px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 gap-4 italic"
                        onClick={() => {
                          const phone = customer.phone?.replace(/[^0-9]/g, "");
                          const text = encodeURIComponent(`Hi ${customer.name}, this is Zenvix Support. How can we help you today?`);
                          window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                        }}
                      >
                        <MessageSquare className="w-6 h-6" />
                        Open WhatsApp Channel
                      </Button>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-relaxed italic">
                        All external channel interactions are documented in the system audit logs for compliance oversight.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrderHistoryList({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const session = useSession();

  const fetchOrders = async () => {
    if (!session.tenantId) return;
    try {
      setLoading(true);
      const data = await retailService.listOrders(session.tenantId, session, {
        customer_id: customerId
      });
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch order history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [customerId, session.tenantId]);

  if (loading) return (
    <div className="p-24 text-center space-y-6">
       <div className="w-12 h-12 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto shadow-2xl" />
       <p className="text-[10px] font-black italic text-slate-500 uppercase tracking-[0.4em] animate-pulse">Scanning Global Ledger...</p>
    </div>
  );

  return (
    <ScrollArea className="h-full pr-6 custom-scrollbar">
      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="p-20 text-center bg-white/5 rounded-[3rem] border border-white/5 border-dashed">
            <p className="text-[11px] font-black italic text-slate-500 uppercase tracking-[0.4em]">No documented transactions</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all duration-500 space-y-6 group/order shadow-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Order Context</p>
                  <p className="text-sm font-mono text-indigo-400 font-bold italic">{order.id.slice(0, 12).toUpperCase()}</p>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg h-7 px-3 font-black italic tracking-widest text-[9px] uppercase">
                  {order.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">{new Date(order.created_at).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                <p className="text-3xl font-black italic text-white tracking-tighter">Rp {(order.total_amount || order.totalAmount || 0).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

function CustomerCartView({ cart }: any) {
  const items = cart?.retail_cart_items || [];
  
  return (
    <ScrollArea className="h-full pr-6 custom-scrollbar">
      <div className="space-y-6">
        {items.length === 0 ? (
          <div className="p-20 text-center bg-white/5 rounded-[3rem] border border-white/5 border-dashed">
            <p className="text-[11px] font-black italic text-slate-500 uppercase tracking-[0.4em]">Asset Staging Area Empty</p>
          </div>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] hover:bg-white/[0.04] hover:border-indigo-500/20 transition-all duration-500 group/cart shadow-xl">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl group-hover/cart:scale-110 transition-transform">
                  <ShoppingCart className="w-7 h-7 text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-black italic text-white tracking-tight">{item.product_id}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Quantity Payload: {item.quantity}</p>
                </div>
              </div>
              <p className="text-2xl font-black italic text-white tracking-tighter">Rp {(item.unit_price * item.quantity).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

function CustomerWishlistView({ wishlist, onExpansionRequest }: any) {
  const items = wishlist?.retail_wishlist_items || [];

  return (
    <ScrollArea className="h-full pr-6 custom-scrollbar">
      <div className="grid grid-cols-2 gap-8">
        {items.length === 0 ? (
          <div className="col-span-2 p-20 text-center bg-white/5 rounded-[3rem] border border-white/5 border-dashed">
            <p className="text-[11px] font-black italic text-slate-500 uppercase tracking-[0.4em]">No Strategic Assets Identified</p>
          </div>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] flex flex-col items-center text-center space-y-6 hover:bg-white/[0.04] hover:border-rose-500/20 transition-all duration-500 group/wish shadow-xl">
              <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-3xl group-hover/wish:scale-110 group-hover/wish:rotate-6 transition-all duration-500">
                <Heart className="w-10 h-10 text-rose-400 fill-rose-400/10" />
              </div>
              <div className="space-y-2">
                 <p className="text-xl font-black italic text-white tracking-tight">{item.product_id}</p>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Asset Monitoring Active</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => onExpansionRequest?.(`Asset Inspection: ${item.product_id}`)}
                className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-white font-black italic text-[11px] uppercase tracking-[0.3em] hover:bg-indigo-600 hover:border-indigo-600 transition-all shadow-2xl"
              >
                Inspect Strategic Asset
              </Button>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
