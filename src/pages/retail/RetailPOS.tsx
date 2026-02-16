import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Search, 
  Monitor, 
  Package,
  Store,
} from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { FeedbackAlert } from "@/core/tools/FeedbackAlert";
import { useSession } from "@/core/security/session";
import { retailService } from "@/core/services/retail/retailService";
import type { RetailOrder, RetailStore, POSDevice } from "@/core/types/retail/retail";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Roles } from "@/core/security/roles";

export default function RetailPOS() {
  const session = useSession();
  const [activeStore, setActiveStore] = useState<RetailStore | null>(null);
  const [stores, setStores] = useState<RetailStore[]>([]);
  const [devices, setDevices] = useState<POSDevice[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [cart, setCart] = useState<{ itemId: string; name: string; price: number; quantity: number }[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const INVENTORY = [
    { id: "item-001", name: "Premium Coffee Beans", price: 15.00, category: "Coffee" },
    { id: "item-002", name: "Ceramic Mug", price: 12.50, category: "Merchandise" },
    { id: "item-003", name: "Tote Bag", price: 8.00, category: "Merchandise" },
    { id: "item-004", name: "Gift Card $50", price: 50.00, category: "Services" },
    { id: "item-005", name: "Dark Roast Blend", price: 18.00, category: "Coffee" },
    { id: "item-006", name: "Travel Tumbler", price: 24.00, category: "Merchandise" },
  ];

  const categories = ["All", ...Array.from(new Set(INVENTORY.map(i => i.category)))];

  const filteredInventory = useMemo(() => {
    return INVENTORY.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  useEffect(() => {
    try {
      const storeList = retailService.listStores(session.tenantId);
      setStores(storeList);
      if (storeList.length > 0) {
        handleStoreChange(storeList[0].id);
      }
    } catch (err) {
      console.error("POS Failed to load", err);
    }
  }, []);

  const handleStoreChange = (storeId: string) => {
    const selected = stores.find(s => s.id === storeId) || retailService.getStore(session.tenantId, storeId);
    if (selected) {
      try {
        retailService.validateAccess(session.tenantId, session.userId, selected.id, session);
        setActiveStore(selected);
        const deviceList = retailService.listDevices(session.tenantId, selected.id);
        setDevices(deviceList);
        if (deviceList.length > 0) setActiveDeviceId(deviceList[0].id);
        setAccessError(null);
      } catch (err: unknown) {
        setActiveStore(null);
        setAccessError(err instanceof Error ? err.message : "Access validation failed");
      }
    }
  };

  const addToCart = (item: typeof INVENTORY[0]) => {
    setCart(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const processCheckout = () => {
    if (!activeStore) return;
    try {
      const order = retailService.createOrder(
         session.tenantId, 
         session, 
         activeStore.id, 
         activeDeviceId,
         cart.map(i => ({ itemId: i.itemId, quantity: i.quantity, unitPrice: i.price, name: i.name }))
      );
      retailService.processPayment(session.tenantId, session, order.id, order.totalAmount, "card");
      setStatusMessage(`Order #${order.id} processed successfully!`);
      setCart([]);
    } catch (err: unknown) {
      setAccessError(err instanceof Error ? err.message : "Checkout failed");
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = cartTotal * 0.1;
  const total = cartTotal + tax;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6">
      <FeedbackAlert message={statusMessage} error={accessError} onClear={() => { setStatusMessage(null); setAccessError(null); }} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader title="POS Terminal" subtitle={activeStore ? `${activeStore.name} (${activeStore.code})` : "Select Store"} />
        <div className="flex items-center gap-3">
          {(session.role === Roles.SUPERADMIN || session.role === Roles.OWNER) && (
            <Select onValueChange={handleStoreChange} value={activeStore?.id}>
              <SelectTrigger className="w-[180px] h-9"><Store className="w-4 h-4 mr-2" /><SelectValue placeholder="Store" /></SelectTrigger>
              <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Select onValueChange={setActiveDeviceId} value={activeDeviceId}>
            <SelectTrigger className="w-[180px] h-9"><Monitor className="w-4 h-4 mr-2" /><SelectValue placeholder="Device" /></SelectTrigger>
            <SelectContent>{devices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 space-y-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search catalog..." className="pl-10 h-11" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
              <TabsList className="h-11">
                {categories.map(cat => <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>)}
              </TabsList>
            </Tabs>
          </div>

          <WorkspacePanel title="Product Catalog" description={`Showing ${filteredInventory.length} items`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
              {filteredInventory.map(item => (
                <Card key={item.id} className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group overflow-hidden" onClick={() => addToCart(item)}>
                  <div className="h-24 bg-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-blue-50">
                    <Package className="w-8 h-8" />
                  </div>
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm line-clamp-1">{item.name}</CardTitle>
                      <Badge variant="secondary" className="text-[9px]">{item.category}</Badge>
                    </div>
                    <CardDescription className="font-bold text-foreground">${item.price.toFixed(2)}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </WorkspacePanel>
        </div>

        <div className="xl:col-span-4">
          <Card className="h-full flex flex-col border-none shadow-lg bg-slate-50/50 sticky top-6">
            <CardHeader className="border-b bg-white rounded-t-lg">
              <CardTitle className="text-xl">Active Cart</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-6 bg-white">
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px] mb-6">
                {cart.length === 0 ? <p className="text-center text-muted-foreground italic py-12">Empty Cart</p> : cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{item.quantity}x</Badge>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-6 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-extrabold text-2xl pt-2"><span>Total</span><span>${total.toFixed(2)}</span></div>
                <Button className="w-full mt-6 bg-blue-600" size="lg" disabled={cart.length === 0} onClick={processCheckout}>Complete Payment</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
