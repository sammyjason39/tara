import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "@/core/security/session";
import { apiRequest } from "@/core/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  History,
  Layout,
  Layers,
  ArrowRightLeft,
  Truck,
  ShoppingCart,
  Settings,
  Activity,
  Box,
  Tags,
  Download,
  Upload,
  BarChart3,
  Globe,
  Database,
  Archive,
  BarChart2,
  ListFilter,
  Image as ImageIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImportDialog } from "@/components/shared/ImportDialog";
import { ExportSettingsDialog as ExportDialog } from "@/components/shared/ExportSettingsDialog";
import { CategoryManager as CategoryDialog } from "@/components/shared/CategoryManager";
import DepartmentWorkspaceLayout from "@/components/layouts/DepartmentWorkspaceLayout";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Stubs for missing components (to be restored/fixed later)
const ItemDetailsModal = (props: any) => null;
const CreateItemDialog = (props: any) => null;

const SECTIONS = [
  {
    title: "INVENTORY OPS",
    items: [
      { id: 'stock', icon: Box, label: "Stock Hub", to: "/core/inventory/stock" },
      { id: 'transfer', icon: ArrowRightLeft, label: "Transfer Desk", to: "/core/inventory/transfer" },
      { id: 'audit', icon: History, label: "Stock Audit", to: "/core/inventory/audit" },
    ]
  },
  {
    title: "PROCUREMENT",
    items: [
      { id: 'orders', icon: ShoppingCart, label: "Purchase Orders", to: "/core/inventory/orders" },
      { id: 'vendors', icon: Truck, label: "Vendor Management", to: "/core/inventory/vendors" },
    ]
  },
  {
    title: "CONFIGURATION",
    items: [
      { id: 'categories', icon: Tags, label: "Categories", to: "/core/inventory/categories" },
      { id: 'settings', icon: Settings, label: "Inventory Settings", to: "/core/inventory/settings" },
    ]
  }
];

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "DISCONTINUED";
  currentStock: number;
  minStock: number;
  unit?: string;
  costPrice?: number;
  sellingPrice?: number;
}

export default function InventoryStockHub() {
  const session = useSession();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImageImportOpen, setIsImageImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<InventoryItem[]>("/inventory/items", "GET", session);
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Could not retrieve catalog data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    return (Array.isArray(items) ? items : []).filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeCategory]);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const lowStock = items.filter((i) => i.currentStock <= i.minStock).length;
    const outOfStock = items.filter((i) => i.currentStock === 0).length;
    const totalValue = items.reduce(
      (acc, i) => acc + (i.currentStock * (i.costPrice || 0)),
      0,
    );
    return { totalItems, lowStock, outOfStock, totalValue };
  }, [items]);

  const headerActions = (
    <div className="flex gap-2">
      <Button
        onClick={() => setIsImportOpen(true)}
        variant="outline"
        className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest h-9"
      >
        <Upload className="h-3 w-3 mr-2" /> Data Import
      </Button>
      <Button
        onClick={() => setIsImageImportOpen(true)}
        variant="outline"
        className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest h-9"
      >
        <ImageIcon className="h-3 w-3 mr-2" /> Image Import
      </Button>
      <Button
        onClick={() => setIsExportOpen(true)}
        variant="outline"
        className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest h-9"
      >
        <Download className="h-3 w-3 mr-2" /> Export
      </Button>
      <div className="w-px h-6 bg-slate-200 mx-1" />
      <Button
        onClick={() => setIsCreateOpen(true)}
        className="rounded-xl bg-slate-900 hover:bg-black text-white shadow-sm font-bold text-[10px] uppercase tracking-widest h-9"
      >
        <Plus className="h-3 w-3 mr-2" /> New Item
      </Button>
      <Button
        onClick={() => setIsCategoryOpen(true)}
        variant="outline"
        className="rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest h-9"
      >
        <Plus className="h-3 w-3 mr-2" /> New Category
      </Button>
    </div>
  );

  const mainContent = (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">{stats.totalItems}</div>
            <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">Across All Nodes</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-amber-600">{stats.lowStock}</div>
            <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-widest">Refinement Required</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter text-rose-600">{stats.outOfStock}</div>
            <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest">Critical Shortage</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Inventory Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500 opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black tracking-tighter">${stats.totalValue?.toLocaleString() ?? "0"}</div>
            <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">Financial Asset Value</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 rounded-[3rem] overflow-hidden">
        <div className="p-8 border-b flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by SKU, Name or Category..."
              className="pl-12 h-14 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl text-sm font-bold shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button variant="outline" className="h-14 px-6 rounded-2xl border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-50">
              <ListFilter className="h-4 w-4 mr-2" /> Filter
            </Button>
            <Button variant="outline" className="h-14 px-6 rounded-2xl border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-50">
              <BarChart2 className="h-4 w-4 mr-2" /> Analytics
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest pl-8 py-6">SKU</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">Item Identity</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-right">Balance</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-center">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-slate-100 dark:border-slate-800">
                      <TableCell colSpan={5} className="py-6 px-8">
                        <Skeleton className="h-12 w-full rounded-xl" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center opacity-20">
                        <Archive className="h-16 w-16 mb-4 stroke-[1]" />
                        <h3 className="text-xl font-black uppercase tracking-widest">No Inventory Found</h3>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="border-slate-100 dark:border-slate-800 group hover:bg-primary/[0.02] cursor-pointer transition-all"
                      onClick={() => setSelectedItem(item)}
                    >
                      <TableCell className="pl-8 py-6">
                        <span className="text-xs font-mono font-black text-slate-400 group-hover:text-primary transition-colors">{item.sku}</span>
                      </TableCell>
                      <TableCell className="py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black tracking-tight">{item.name}</span>
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{item.category || "General"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-black ${item.currentStock <= item.minStock ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                            {item.currentStock?.toLocaleString() ?? "0"} {item.unit || 'units'}
                          </span>
                          {item.currentStock <= item.minStock && (
                            <span className="text-[9px] font-black uppercase tracking-tighter text-rose-500 mt-0.5">Threshold Alert</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-6 text-center">
                        <Badge variant="outline" className={`text-[9px] font-black tracking-[0.2em] rounded-lg border-none uppercase ${
                          item.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 
                          item.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-500' : 
                          'bg-slate-500/10 text-slate-500'
                        }`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-6 text-right pr-8">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-xl hover:bg-primary/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl border-none shadow-2xl p-2 bg-white dark:bg-slate-900">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest opacity-40 px-4 py-3">Operations</DropdownMenuLabel>
                            <DropdownMenuItem className="rounded-xl px-4 py-3 text-xs font-bold cursor-pointer"><TrendingUp className="h-4 w-4 mr-3" /> Quick Adjustment</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl px-4 py-3 text-xs font-bold cursor-pointer"><ArrowRightLeft className="h-4 w-4 mr-3" /> Execute Transfer</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl px-4 py-3 text-xs font-bold cursor-pointer"><History className="h-4 w-4 mr-3" /> Movement Logs</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-2 mx-2" />
                            <DropdownMenuItem className="rounded-xl px-4 py-3 text-xs font-bold cursor-pointer text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"><Settings className="h-4 w-4 mr-3" /> Discontinue Item</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DepartmentWorkspaceLayout
      title="Stock Hub"
      subtitle="Strategic inventory visibility and logistics command."
      headerIcon={Package}
      accentColor="blue"
      engineName="LOGISTICS_ENGINE"
      pulseLabel="Supply Pulse"
      pulseIcon={Activity}
      sections={SECTIONS}
      routeLabels={{}}
      basePath="/core/inventory/stock"
      headerActions={headerActions}
    >
      {mainContent}

      <ItemDetailsModal
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
        onUpdated={fetchData}
      />

      <CreateItemDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={fetchData}
      />

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSuccess={fetchData}
        endpoint="inventory/items/import"
        title="Bulk Inventory Import"
      />

      <ImportDialog
        open={isImageImportOpen}
        onOpenChange={setIsImageImportOpen}
        onSuccess={fetchData}
        type="IMAGES"
        endpoint="inventory/items/import/images"
        title="Bulk Image Upload"
      />

      <ExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
      />

      <CategoryDialog
        open={isCategoryOpen}
        onOpenChange={setIsCategoryOpen}
        onSuccess={fetchData}
      />
    </DepartmentWorkspaceLayout>
  );
}
