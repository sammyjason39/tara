import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Receipt,
  Calendar,
  Clock,
  CreditCard,
  Banknote,
  Smartphone,
  Eye,
  RotateCcw,
  Package,
  User,
} from 'lucide-react';
import { formatCurrency, formatDate, formatTime } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  staffId: string;
  staffName: string;
  createdAt: string;
  status: 'completed' | 'refunded' | 'voided';
}

// Mock transaction history
const mockTransactions: Transaction[] = [
  {
    id: 'TXN-001',
    items: [
      { name: 'Coffee Beans 250g', quantity: 2, price: 14.99 },
      { name: 'Ceramic Mug', quantity: 1, price: 12.00 },
    ],
    subtotal: 41.98,
    tax: 3.36,
    total: 45.34,
    paymentMethod: 'card',
    staffId: '2',
    staffName: 'Mike Chen',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    status: 'completed',
  },
  {
    id: 'TXN-002',
    items: [
      { name: 'Gift Card $50', quantity: 1, price: 50.00 },
    ],
    subtotal: 50.00,
    tax: 0,
    total: 50.00,
    paymentMethod: 'cash',
    staffId: '2',
    staffName: 'Mike Chen',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    status: 'completed',
  },
  {
    id: 'TXN-003',
    items: [
      { name: 'French Press', quantity: 1, price: 34.99 },
      { name: 'Coffee Beans 250g', quantity: 1, price: 14.99 },
    ],
    subtotal: 49.98,
    tax: 4.00,
    total: 53.98,
    paymentMethod: 'mobile',
    staffId: '5',
    staffName: 'Anna Williams',
    createdAt: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    status: 'completed',
  },
  {
    id: 'TXN-004',
    items: [
      { name: 'Travel Tumbler', quantity: 2, price: 24.99 },
    ],
    subtotal: 49.98,
    tax: 4.00,
    total: 53.98,
    paymentMethod: 'card',
    staffId: '2',
    staffName: 'Mike Chen',
    createdAt: new Date(Date.now() - 3 * 60 * 60000).toISOString(),
    status: 'refunded',
  },
  {
    id: 'TXN-005',
    items: [
      { name: 'Pour Over Set', quantity: 1, price: 29.99 },
      { name: 'Espresso Cups Set', quantity: 1, price: 18.00 },
    ],
    subtotal: 47.99,
    tax: 3.84,
    total: 51.83,
    paymentMethod: 'card',
    staffId: '5',
    staffName: 'Anna Williams',
    createdAt: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    status: 'completed',
  },
];

const paymentIcons = {
  cash: Banknote,
  card: CreditCard,
  mobile: Smartphone,
};

const statusConfig = {
  completed: { label: 'Completed', variant: 'default' as const },
  refunded: { label: 'Refunded', variant: 'secondary' as const },
  voided: { label: 'Voided', variant: 'destructive' as const },
};

export default function RetailHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Calculate stats
  const todayTotal = mockTransactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.total, 0);
  const transactionCount = mockTransactions.length;
  const refundCount = mockTransactions.filter((t) => t.status === 'refunded').length;

  // Filter transactions
  const filteredTransactions = mockTransactions.filter((t) => {
    const matchesSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.items.some((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || t.paymentMethod === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Sales</p>
                <p className="text-xl font-bold">{formatCurrency(todayTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/50">
                <Package className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{transactionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <RotateCcw className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Refunds</p>
                <p className="text-xl font-bold">{refundCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-22rem)]">
            <div className="divide-y">
              {filteredTransactions.map((transaction) => {
                const PaymentIcon = paymentIcons[transaction.paymentMethod];
                const status = statusConfig[transaction.status];
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.id}</span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''} • {transaction.staffName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          transaction.status === 'refunded' && 'text-destructive line-through'
                        )}>
                          {formatCurrency(transaction.total)}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(transaction.createdAt)}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted">
                        <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Button disabled title="Not available yet" variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">{selectedTransaction.id}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedTransaction.createdAt)}
                    <Clock className="h-4 w-4 ml-2" />
                    {formatTime(selectedTransaction.createdAt)}
                  </div>
                </div>
                <Badge variant={statusConfig[selectedTransaction.status].variant}>
                  {statusConfig[selectedTransaction.status].label}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Processed by {selectedTransaction.staffName}</span>
              </div>

              <div className="border rounded-lg divide-y">
                {selectedTransaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between p-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatCurrency(item.quantity * item.price)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(selectedTransaction.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(selectedTransaction.total)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Payment Method</span>
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = paymentIcons[selectedTransaction.paymentMethod];
                    return <Icon className="h-4 w-4" />;
                  })()}
                  <span className="capitalize font-medium">
                    {selectedTransaction.paymentMethod}
                  </span>
                </div>
              </div>

              {selectedTransaction.status === 'completed' && (
                <Button disabled title="Not available yet" variant="outline" className="w-full">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Issue Refund
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
