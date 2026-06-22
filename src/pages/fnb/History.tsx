import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/format';
import { formatTime } from '@/lib/mock-data';
import { Search, Receipt, Calendar, CreditCard, Banknote, Smartphone, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface HistoryOrder {
  id: string;
  tableNumber: number;
  items: Array<{ name: string; quantity: number; price: number; modifiers?: string[] }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  paidAt: string;
  server: string;
}

const mockHistory: HistoryOrder[] = [
  {
    id: 'ORD-001',
    tableNumber: 3,
    items: [
      { name: 'Cappuccino', quantity: 2, price: 4.50, modifiers: ['Oat Milk'] },
      { name: 'Croissant', quantity: 2, price: 3.50 },
    ],
    subtotal: 16.00,
    tax: 1.60,
    total: 17.60,
    paymentMethod: 'card',
    paidAt: new Date(Date.now() - 30 * 60000).toISOString(),
    server: 'Sarah M.',
  },
  {
    id: 'ORD-002',
    tableNumber: 7,
    items: [
      { name: 'Eggs Benedict', quantity: 1, price: 14.00 },
      { name: 'Fresh Orange Juice', quantity: 1, price: 5.00 },
      { name: 'Latte', quantity: 1, price: 4.50, modifiers: ['Decaf'] },
    ],
    subtotal: 23.50,
    tax: 2.35,
    total: 25.85,
    paymentMethod: 'cash',
    paidAt: new Date(Date.now() - 45 * 60000).toISOString(),
    server: 'Mike T.',
  },
  {
    id: 'ORD-003',
    tableNumber: 1,
    items: [
      { name: 'Avocado Toast', quantity: 2, price: 12.00 },
      { name: 'Green Tea', quantity: 2, price: 3.00 },
    ],
    subtotal: 30.00,
    tax: 3.00,
    total: 33.00,
    paymentMethod: 'mobile',
    paidAt: new Date(Date.now() - 90 * 60000).toISOString(),
    server: 'Sarah M.',
  },
  {
    id: 'ORD-004',
    tableNumber: 5,
    items: [
      { name: 'Club Sandwich', quantity: 1, price: 11.00, modifiers: ['No Onion'] },
      { name: 'Iced Coffee', quantity: 1, price: 4.00, modifiers: ['Less Ice'] },
    ],
    subtotal: 15.00,
    tax: 1.50,
    total: 16.50,
    paymentMethod: 'card',
    paidAt: new Date(Date.now() - 120 * 60000).toISOString(),
    server: 'Mike T.',
  },
  {
    id: 'ORD-005',
    tableNumber: 2,
    items: [
      { name: 'Pancake Stack', quantity: 1, price: 10.00 },
      { name: 'Cappuccino', quantity: 2, price: 4.50 },
      { name: 'Fresh Fruit Bowl', quantity: 1, price: 7.00 },
    ],
    subtotal: 26.00,
    tax: 2.60,
    total: 28.60,
    paymentMethod: 'card',
    paidAt: new Date(Date.now() - 180 * 60000).toISOString(),
    server: 'Sarah M.',
  },
];

const PaymentIcon = ({ method }: { method: 'cash' | 'card' | 'mobile' }) => {
  switch (method) {
    case 'cash': return <Banknote size={14} />;
    case 'card': return <CreditCard size={14} />;
    case 'mobile': return <Smartphone size={14} />;
  }
};

export default function CafeHistory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<HistoryOrder | null>(null);

  const filteredOrders = (Array.isArray(mockHistory) ? mockHistory : []).filter(order => 
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.tableNumber.toString().includes(searchQuery) ||
    order.server.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayTotal = mockHistory.reduce((sum, order) => sum + order.total, 0);
  const todayOrders = mockHistory.length;

  return (
    <div className="p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="text-primary" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Orders</p>
                <p className="text-2xl font-bold">{todayOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CreditCard className="text-success" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(todayTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search by order ID, table, or server..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Order List */}
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-3">
          {(Array.isArray(filteredOrders) ? filteredOrders : []).map((order) => (
            <Card key={order.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedOrder(order)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">T{order.tableNumber}</span>
                    </div>
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar size={12} />
                        <span>{formatTime(order.paidAt)}</span>
                        <span>•</span>
                        <span>{order.server}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.total)}</p>
                    <Badge variant="outline" className="gap-1 mt-1">
                      <PaymentIcon method={order.paymentMethod} />
                      {order.paymentMethod}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order {selectedOrder?.id}</span>
              <Badge variant="outline">Table {selectedOrder?.tableNumber}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar size={14} />
                <span>{formatDate(selectedOrder.paidAt)} at {formatTime(selectedOrder.paidAt)}</span>
              </div>

              <Separator />

              <div className="space-y-2">
                {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <span>{item.quantity}x {item.name}</span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground">{item.modifiers.join(', ')}</p>
                      )}
                    </div>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <PaymentIcon method={selectedOrder.paymentMethod} />
                  <span className="capitalize">{selectedOrder.paymentMethod}</span>
                </div>
                <span className="text-sm text-muted-foreground">Server: {selectedOrder.server}</span>
              </div>

              <Button onClick={(e) => { e.preventDefault(); window.print(); }} variant="outline" className="w-full gap-2">
                <Receipt size={16} />
                Reprint Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
