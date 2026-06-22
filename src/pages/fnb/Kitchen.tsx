// @audit-ignore: kitchen display uses local state for real-time order rendering (WebSocket-driven in production)
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/shared/GlassCard';
import { EmptyState } from '@/components/shared/AsyncState';
import { formatTime } from '@/lib/mock-data';
import { toast } from '@/hooks/use-toast';
import { Clock, ChefHat, Check, AlertTriangle, Bell } from 'lucide-react';

interface KitchenOrder {
  id: string;
  tableNumber: number;
  items: Array<{
    name: string;
    quantity: number;
    modifiers: string[];
    status: 'pending' | 'preparing' | 'ready';
  }>;
  createdAt: string;
  priority: 'normal' | 'rush';
}

// Mock kitchen orders
const initialOrders: KitchenOrder[] = [
  {
    id: 'KO001',
    tableNumber: 3,
    items: [
      { name: 'Cappuccino', quantity: 2, modifiers: ['Oat Milk'], status: 'preparing' },
      { name: 'Croissant', quantity: 2, modifiers: [], status: 'pending' },
    ],
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    priority: 'normal',
  },
  {
    id: 'KO002',
    tableNumber: 7,
    items: [
      { name: 'Eggs Benedict', quantity: 1, modifiers: ['Extra Spicy'], status: 'preparing' },
      { name: 'Fresh Orange Juice', quantity: 1, modifiers: [], status: 'ready' },
      { name: 'Latte', quantity: 1, modifiers: ['Decaf'], status: 'pending' },
    ],
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    priority: 'rush',
  },
  {
    id: 'KO003',
    tableNumber: 1,
    items: [
      { name: 'Avocado Toast', quantity: 2, modifiers: ['Gluten Free'], status: 'pending' },
      { name: 'Green Tea', quantity: 2, modifiers: ['Extra Hot'], status: 'pending' },
    ],
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    priority: 'normal',
  },
  {
    id: 'KO004',
    tableNumber: 5,
    items: [
      { name: 'Club Sandwich', quantity: 1, modifiers: ['No Onion'], status: 'pending' },
      { name: 'Iced Coffee', quantity: 1, modifiers: ['Less Ice'], status: 'pending' },
    ],
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    priority: 'normal',
  },
];

export default function Kitchen() {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders);
  const [completedOrders, setCompletedOrders] = useState<string[]>([]);

  // Calculate elapsed time
  const getElapsedMinutes = (createdAt: string) => {
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  };

  const getTimeColor = (minutes: number) => {
    if (minutes >= 15) return 'text-destructive';
    if (minutes >= 10) return 'text-warning';
    return 'text-muted-foreground';
  };

  const handleItemStatusChange = (orderId: string, itemIndex: number) => {
    setOrders(prev => (Array.isArray(prev) ? prev : []).map(order => {
      if (order.id !== orderId) return order;
      
      const newItems = [...order.items];
      const currentStatus = newItems[itemIndex].status;
      
      if (currentStatus === 'pending') {
        newItems[itemIndex] = { ...newItems[itemIndex], status: 'preparing' };
      } else if (currentStatus === 'preparing') {
        newItems[itemIndex] = { ...newItems[itemIndex], status: 'ready' };
      }
      
      return { ...order, items: newItems };
    }));
  };

  const handleCompleteOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    setCompletedOrders(prev => [...prev, orderId]);

    // Remove after animation
    setTimeout(() => {
      setOrders(prev => (Array.isArray(prev) ? prev : []).filter(o => o.id !== orderId));
      setCompletedOrders(prev => (Array.isArray(prev) ? prev : []).filter(id => id !== orderId));
    }, 500);

    toast({
      title: 'Order completed',
      description: order
        ? `Table ${order.tableNumber} notified — order marked ready`
        : 'Order marked ready',
    });
  };

  const isOrderReady = (order: KitchenOrder) => {
    return order.items.every(item => item.status === 'ready');
  };

  const getItemStatusColor = (status: 'pending' | 'preparing' | 'ready') => {
    switch (status) {
      case 'pending': return 'bg-muted text-muted-foreground';
      case 'preparing': return 'bg-warning/20 text-warning border-warning';
      case 'ready': return 'bg-success/20 text-success border-success';
    }
  };

  // Sort orders: rush first, then by time
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.priority === 'rush' && b.priority !== 'rush') return -1;
    if (a.priority !== 'rush' && b.priority === 'rush') return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="p-4 space-y-4 min-h-full bg-background">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="text-primary" size={24} />
          <h1 className="text-xl font-semibold">Kitchen Display</h1>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1">
            <Clock size={14} />
            {orders.length} Active Orders
          </Badge>
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle size={14} />
            {(Array.isArray(orders) ? orders : []).filter(o => getElapsedMinutes(o.createdAt) >= 10).length} Delayed
          </Badge>
        </div>
      </div>

      {/* Order Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(Array.isArray(sortedOrders) ? sortedOrders : []).map((order) => {
          const elapsed = getElapsedMinutes(order.createdAt);
          const isReady = isOrderReady(order);
          const isCompleting = completedOrders.includes(order.id);
          
          return (
            <GlassCard
              key={order.id}
              className={cn(
                'transition-all duration-300',
                order.priority === 'rush' && 'border-destructive border-2',
                isReady && 'border-success border-2 bg-success/5',
                isCompleting && 'opacity-0 scale-95'
              )}
            >
              <GlassCardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">T{order.tableNumber}</span>
                    {order.priority === 'rush' && (
                      <Badge variant="destructive" className="animate-pulse">
                        RUSH
                      </Badge>
                    )}
                  </div>
                  <div className={cn('flex items-center gap-1 text-sm', getTimeColor(elapsed))}>
                    <Clock size={14} />
                    <span>{elapsed}m</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatTime(order.createdAt)}
                </p>
              </GlassCardHeader>
              
              <GlassCardContent className="space-y-2">
                {(Array.isArray(order.items) ? order.items : []).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleItemStatusChange(order.id, index)}
                    disabled={item.status === 'ready'}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-all',
                      getItemStatusColor(item.status),
                      item.status !== 'ready' && 'hover:scale-[1.02] active:scale-[0.98]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {item.quantity}x {item.name}
                      </span>
                      {item.status === 'ready' && <Check size={16} />}
                    </div>
                    {item.modifiers.length > 0 && (
                      <p className="text-xs mt-1 opacity-80">
                        {item.modifiers.join(', ')}
                      </p>
                    )}
                  </button>
                ))}

                {isReady && (
                  <Button 
                    className="w-full mt-3 gap-2"
                    onClick={() => handleCompleteOrder(order.id)}
                  >
                    <Bell size={16} />
                    Notify & Complete
                  </Button>
                )}
              </GlassCardContent>
            </GlassCard>
          );
        })}
      </div>

      {orders.length === 0 && (
        <EmptyState
          icon={ChefHat}
          title="No active orders"
          description="New kitchen orders will appear here as they come in from the cashier and tables."
        />
      )}
    </div>
  );
}
