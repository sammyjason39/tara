import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { type Table, formatCurrency } from '@/lib/mock-data';
import { CreditCard, Banknote, Smartphone, Receipt, Check, SplitSquareVertical } from 'lucide-react';

interface TableBillingProps {
  table: Table | null;
  onComplete: () => void;
  onCancel: () => void;
}

type PaymentMethod = 'cash' | 'card' | 'mobile' | null;

export function TableBilling({ table, onComplete, onCancel }: TableBillingProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [splitCount, setSplitCount] = useState(1);

  if (!table?.currentOrder) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No order to bill</p>
        <Button variant="outline" className="mt-4" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  const subtotal = table.currentOrder.total;
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;
  const perPerson = total / splitCount;

  const handlePayment = () => {
    if (paymentMethod) {
      setIsPaid(true);
      // Simulate payment processing
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  };

  if (isPaid) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h3 className="text-xl font-semibold">Payment Complete</h3>
        <p className="text-muted-foreground">Table {table.number} - {formatCurrency(total)}</p>
        <p className="text-sm text-muted-foreground">Clearing table...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-lg font-semibold">Table {table.number} Bill</h3>
        <p className="text-sm text-muted-foreground">{table.currentOrder.items.length} items</p>
      </div>

      {/* Order Items */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {table.currentOrder.items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
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

      {/* Totals */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tax (10%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold pt-2">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Split Bill */}
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <SplitSquareVertical size={18} className="text-muted-foreground" />
        <span className="text-sm flex-1">Split bill</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={splitCount <= 1}
            onClick={() => setSplitCount(prev => Math.max(1, prev - 1))}
          >
            -
          </Button>
          <span className="w-8 text-center">{splitCount}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={splitCount >= 10}
            onClick={() => setSplitCount(prev => Math.min(10, prev + 1))}
          >
            +
          </Button>
        </div>
      </div>

      {splitCount > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          {formatCurrency(perPerson)} per person
        </div>
      )}

      <Separator />

      {/* Payment Methods */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Payment Method</p>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={paymentMethod === 'cash' ? 'default' : 'outline'}
            className="h-16 flex-col gap-1"
            onClick={() => setPaymentMethod('cash')}
          >
            <Banknote size={20} />
            <span className="text-xs">Cash</span>
          </Button>
          <Button
            variant={paymentMethod === 'card' ? 'default' : 'outline'}
            className="h-16 flex-col gap-1"
            onClick={() => setPaymentMethod('card')}
          >
            <CreditCard size={20} />
            <span className="text-xs">Card</span>
          </Button>
          <Button
            variant={paymentMethod === 'mobile' ? 'default' : 'outline'}
            className="h-16 flex-col gap-1"
            onClick={() => setPaymentMethod('mobile')}
          >
            <Smartphone size={20} />
            <span className="text-xs">Mobile</span>
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          className="flex-1 gap-2" 
          disabled={!paymentMethod}
          onClick={handlePayment}
        >
          <Receipt size={16} />
          Complete
        </Button>
      </div>
    </div>
  );
}
