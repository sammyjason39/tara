import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/shared/AsyncState';
import { mockTables, mockCafeProducts, type Table, type Product } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { OrderPad } from '@/components/pos-cafe/OrderPad';
import { TableBilling } from '@/components/pos-cafe/TableBilling';
import { Users, Clock, Plus, Receipt, LayoutGrid } from 'lucide-react';

type TableAction = 'order' | 'billing' | null;

export default function CafeTables() {
  const [tables, setTables] = useState<Table[]>(mockTables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableAction, setTableAction] = useState<TableAction>(null);

  const getTableStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available':
        return 'bg-success/20 border-success text-success-foreground hover:bg-success/30';
      case 'occupied':
        return 'bg-warning/20 border-warning text-warning-foreground hover:bg-warning/30';
      case 'reserved':
        return 'bg-primary/20 border-primary text-primary-foreground hover:bg-primary/30';
      case 'cleaning':
        return 'bg-muted border-muted-foreground/30 text-muted-foreground hover:bg-muted/80';
      default:
        return 'bg-card border-border';
    }
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    if (table.status === 'available') {
      // Start new order
      setTableAction('order');
    } else if (table.status === 'occupied') {
      // Show options
      setTableAction(null);
    }
  };

  const handleStartOrder = () => {
    if (selectedTable) {
      setTables(prev => (Array.isArray(prev) ? prev : []).map(t => 
        t.id === selectedTable.id 
          ? { ...t, status: 'occupied' as const, occupiedSince: new Date().toISOString() }
          : t
      ));
      setTableAction('order');
      toast({
        title: 'Order started',
        description: `Table ${selectedTable.number} is now occupied`,
      });
    }
  };

  const handleOpenBilling = () => {
    setTableAction('billing');
  };

  const handleAddMoreItems = () => {
    setTableAction('order');
  };

  const handleOrderComplete = (items: Array<{ product: Product; quantity: number; modifiers: string[] }>) => {
    if (selectedTable) {
      const orderTotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      setTables(prev => (Array.isArray(prev) ? prev : []).map(t => 
        t.id === selectedTable.id 
          ? { 
              ...t, 
              currentOrder: {
                items: (Array.isArray(items) ? items : []).map(i => ({
                  productId: i.product.id,
                  name: i.product.name,
                  quantity: i.quantity,
                  price: i.product.price,
                  modifiers: i.modifiers,
                })),
                total: (t.currentOrder?.total || 0) + orderTotal,
              }
            }
          : t
      ));
      setSelectedTable(prev => prev ? {
        ...prev,
        currentOrder: {
          items: (Array.isArray(items) ? items : []).map(i => ({
            productId: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
            modifiers: i.modifiers,
          })),
          total: (prev.currentOrder?.total || 0) + orderTotal,
        }
      } : null);
      toast({
        title: 'Order sent to kitchen',
        description: `Table ${selectedTable.number} — ${formatCurrency(orderTotal)} added`,
      });
    }
    setTableAction(null);
  };

  const handleBillingComplete = () => {
    if (selectedTable) {
      setTables(prev => (Array.isArray(prev) ? prev : []).map(t => 
        t.id === selectedTable.id 
          ? { ...t, status: 'cleaning' as const, currentOrder: undefined, occupiedSince: undefined }
          : t
      ));
      // Auto-reset to available after 30 seconds (simulating cleaning)
      setTimeout(() => {
        setTables(prev => (Array.isArray(prev) ? prev : []).map(t => 
          t.id === selectedTable.id ? { ...t, status: 'available' as const } : t
        ));
      }, 30000);
      toast({
        title: 'Payment complete',
        description: `Table ${selectedTable.number} settled and set for cleaning`,
      });
    }
    setSelectedTable(null);
    setTableAction(null);
  };

  const handleClose = () => {
    setSelectedTable(null);
    setTableAction(null);
  };

  const getOccupiedDuration = (occupiedSince?: string) => {
    if (!occupiedSince) return '';
    const minutes = Math.floor((Date.now() - new Date(occupiedSince).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Status Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success/40 border border-success" />
          <span className="text-sm text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning/40 border border-warning" />
          <span className="text-sm text-muted-foreground">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/40 border border-primary" />
          <span className="text-sm text-muted-foreground">Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted border border-muted-foreground/30" />
          <span className="text-sm text-muted-foreground">Cleaning</span>
        </div>
      </div>

      {/* Table Grid */}
      {tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No tables configured"
          description="No tables exist for this venue yet. Configure the floor plan to start seating guests."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {(Array.isArray(tables) ? tables : []).map((table) => (
            <button
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={cn(
                'relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all touch-target min-h-[120px]',
                getTableStatusColor(table.status)
              )}
            >
              <span className="text-2xl font-bold">{table.number}</span>
              <div className="flex items-center gap-1 text-sm mt-1">
                <Users size={14} />
                <span>{table.capacity}</span>
              </div>
              
              {table.status === 'occupied' && table.occupiedSince && (
                <div className="flex items-center gap-1 text-xs mt-2 opacity-80">
                  <Clock size={12} />
                  <span>{getOccupiedDuration(table.occupiedSince)}</span>
                </div>
              )}
              
              {table.currentOrder && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                  {formatCurrency(table.currentOrder.total)}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Table Action Dialog */}
      <Dialog open={!!selectedTable && tableAction === null && selectedTable.status !== 'available'} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Table {selectedTable?.number}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedTable?.currentOrder && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Current Order</p>
                <p className="text-lg font-semibold">{formatCurrency(selectedTable.currentOrder.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedTable.currentOrder.items.length} items
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-1"
                onClick={handleAddMoreItems}
              >
                <Plus size={20} />
                <span>Add Items</span>
              </Button>
              <Button 
                className="h-16 flex-col gap-1"
                onClick={handleOpenBilling}
              >
                <Receipt size={20} />
                <span>Bill</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Pad Dialog */}
      <Dialog open={tableAction === 'order'} onOpenChange={(open) => !open && setTableAction(null)}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          <OrderPad 
            table={selectedTable}
            products={(Array.isArray(mockCafeProducts) ? mockCafeProducts : []).filter(p => p.category !== 'Retail')}
            onComplete={handleOrderComplete}
            onCancel={() => setTableAction(null)}
          />
        </DialogContent>
      </Dialog>

      {/* Billing Dialog */}
      <Dialog open={tableAction === 'billing'} onOpenChange={(open) => !open && setTableAction(null)}>
        <DialogContent className="max-w-md">
          <TableBilling 
            table={selectedTable}
            onComplete={handleBillingComplete}
            onCancel={() => setTableAction(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
