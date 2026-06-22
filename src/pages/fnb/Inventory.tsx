import { useState } from 'react';
import { GlassCard, GlassCardContent } from '@/components/shared/GlassCard';
import { EmptyState } from '@/components/shared/AsyncState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Coffee,
  AlertTriangle,
  TrendingDown,
  RefreshCw,
  Plus,
  Minus,
  Truck,
  ArrowUpDown,
  Edit,
  Trash2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockCafeProducts, Product, generateId } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/hooks/use-toast';

interface InventoryItem extends Product {
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  unit: string;
}

// Cafe inventory with additional properties
const initialInventory: InventoryItem[] = (Array.isArray(mockCafeProducts) ? mockCafeProducts : []).map((p) => ({
  ...p,
  stock: Math.floor(Math.random() * 50) + 10,
  minStock: 5,
  maxStock: 100,
  reorderPoint: 15,
  unit: p.category?.includes('Coffee') ? 'servings' : 'units',
}));

const cafeCategories = ['All', 'Hot Coffee', 'Cold Coffee', 'Tea', 'Pastries', 'Food', 'Other'];

export default function CafeInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  
  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    stock: '',
    minStock: '5',
    maxStock: '100',
    reorderPoint: '15',
    unit: 'units',
  });
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Calculate stats
  const lowStockItems = (Array.isArray(inventory) ? inventory : []).filter((i) => i.stock !== undefined && i.stock <= i.reorderPoint);
  const outOfStockItems = (Array.isArray(inventory) ? inventory : []).filter((i) => i.stock === 0);
  const totalValue = inventory.reduce((sum, i) => sum + (i.stock || 0) * i.price, 0);

  // Filter and sort
  const filteredInventory = (Array.isArray(inventory) ? inventory : []).filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
      
      if (filterStatus === 'low') return matchesSearch && matchesCategory && item.stock !== undefined && item.stock <= item.reorderPoint;
      if (filterStatus === 'out') return matchesSearch && matchesCategory && item.stock === 0;
      if (filterStatus === 'ok') return matchesSearch && matchesCategory && item.stock !== undefined && item.stock > item.reorderPoint;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock-asc') return (a.stock || 0) - (b.stock || 0);
      if (sortBy === 'stock-desc') return (b.stock || 0) - (a.stock || 0);
      if (sortBy === 'value') return (b.stock || 0) * b.price - (a.stock || 0) * a.price;
      return 0;
    });

  const getStockStatus = (item: InventoryItem) => {
    if (!item.stock || item.stock === 0) return { label: 'Out of Stock', variant: 'destructive' as const, color: 'text-destructive' };
    if (item.stock <= item.reorderPoint) return { label: 'Low Stock', variant: 'secondary' as const, color: 'text-warning' };
    return { label: 'In Stock', variant: 'default' as const, color: 'text-success' };
  };

  const getStockPercent = (item: InventoryItem) => {
    if (!item.stock) return 0;
    return Math.min(100, (item.stock / item.maxStock) * 100);
  };

  // Add new item
  const handleAddItem = () => {
    if (!formData.name || !formData.category || !formData.price) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const newItem: InventoryItem = {
      id: generateId(),
      name: formData.name,
      category: formData.category,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock) || 0,
      minStock: parseInt(formData.minStock),
      maxStock: parseInt(formData.maxStock),
      reorderPoint: parseInt(formData.reorderPoint),
      unit: formData.unit,
    };

    setInventory((prev) => [...prev, newItem]);
    toast({ title: 'Item added', description: `${newItem.name} has been added to inventory` });
    setIsAddOpen(false);
    resetForm();
  };

  // Edit item
  const handleEditItem = () => {
    if (!selectedProduct || !formData.name || !formData.category || !formData.price) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setInventory((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) =>
        item.id === selectedProduct.id
          ? {
              ...item,
              name: formData.name,
              category: formData.category,
              price: parseFloat(formData.price),
              stock: parseInt(formData.stock) || 0,
              minStock: parseInt(formData.minStock),
              maxStock: parseInt(formData.maxStock),
              reorderPoint: parseInt(formData.reorderPoint),
              unit: formData.unit,
            }
          : item
      )
    );

    toast({ title: 'Item updated', description: `${formData.name} has been updated` });
    setIsEditOpen(false);
    setSelectedProduct(null);
    resetForm();
  };

  // Delete item
  const handleDeleteItem = () => {
    if (!selectedProduct) return;

    setInventory((prev) => (Array.isArray(prev) ? prev : []).filter((item) => item.id !== selectedProduct.id));
    toast({ title: 'Item deleted', description: `${selectedProduct.name} has been removed` });
    setIsDeleteOpen(false);
    setSelectedProduct(null);
  };

  // Adjust stock
  const handleAdjustStock = () => {
    if (!selectedProduct || adjustQuantity === 0) return;

    setInventory((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) =>
        item.id === selectedProduct.id
          ? { ...item, stock: Math.max(0, (item.stock || 0) + adjustQuantity) }
          : item
      )
    );

    toast({
      title: 'Stock adjusted',
      description: `${selectedProduct.name}: ${adjustQuantity > 0 ? '+' : ''}${adjustQuantity} ${selectedProduct.unit}`,
    });

    setIsAdjustOpen(false);
    setSelectedProduct(null);
    setAdjustQuantity(0);
    setAdjustReason('');
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      stock: '',
      minStock: '5',
      maxStock: '100',
      reorderPoint: '15',
      unit: 'units',
    });
  };

  const openEditDialog = (item: InventoryItem) => {
    setSelectedProduct(item);
    setFormData({
      name: item.name,
      category: item.category || '',
      price: item.price.toString(),
      stock: item.stock?.toString() || '0',
      minStock: item.minStock.toString(),
      maxStock: item.maxStock.toString(),
      reorderPoint: item.reorderPoint.toString(),
      unit: item.unit,
    });
    setIsEditOpen(true);
  };

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Coffee className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{inventory.length}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Package className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold">{lowStockItems.length}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-bold">{outOfStockItems.length}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {(Array.isArray(cafeCategories) ? cafeCategories : []).map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ok">In Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-32">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="stock-asc">Stock (Low)</SelectItem>
            <SelectItem value="stock-desc">Stock (High)</SelectItem>
            <SelectItem value="value">Value</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Inventory List */}
      <GlassCard className="flex-1">
        <ScrollArea className="h-[calc(100vh-20rem)]">
          {filteredInventory.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No inventory items"
              description="No items match the current search, category, or status filters. Adjust filters or add a new item to get started."
            />
          ) : (
            <div className="divide-y">
              {(Array.isArray(filteredInventory) ? filteredInventory : []).map((item) => {
              const status = getStockStatus(item);
              const stockPercent = getStockPercent(item);

              return (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <Coffee className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{item.name}</h4>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={stockPercent} className="h-2 flex-1" />
                      <span className={cn('text-sm font-medium', status.color)}>
                        {item.stock} / {item.maxStock} {item.unit}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(item.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      Value: {formatCurrency((item.stock || 0) * item.price)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(item);
                        setIsAdjustOpen(true);
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        setSelectedProduct(item);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </ScrollArea>
      </GlassCard>

      {/* Add Item Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(cafeCategories) ? cafeCategories : []).filter((c) => c !== 'All').map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="units">Units</SelectItem>
                    <SelectItem value="servings">Servings</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Stock</Label>
                <Input
                  type="number"
                  value={formData.maxStock}
                  onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reorder Point</Label>
                <Input
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(cafeCategories) ? cafeCategories : []).filter((c) => c !== 'All').map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="units">Units</SelectItem>
                    <SelectItem value="servings">Servings</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Min Stock</Label>
                <Input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Stock</Label>
                <Input
                  type="number"
                  value={formData.maxStock}
                  onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Reorder Point</Label>
                <Input
                  type="number"
                  value={formData.reorderPoint}
                  onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditItem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete <strong>{selectedProduct?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Coffee className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current: {selectedProduct.stock} {selectedProduct.unit}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adjustment</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAdjustQuantity((q) => q - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                    className="text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setAdjustQuantity((q) => q + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  New stock: {Math.max(0, (selectedProduct.stock || 0) + adjustQuantity)} {selectedProduct.unit}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Stock Received</SelectItem>
                    <SelectItem value="damaged">Damaged/Expired</SelectItem>
                    <SelectItem value="count">Physical Count</SelectItem>
                    <SelectItem value="waste">Waste</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock} disabled={adjustQuantity === 0 || !adjustReason}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
