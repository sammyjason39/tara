import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Table, type Product, formatCurrency } from '@/lib/mock-data';
import { Minus, Plus, X, Send, Trash2 } from 'lucide-react';

interface OrderItem {
  product: Product;
  quantity: number;
  modifiers: string[];
}

interface OrderPadProps {
  table: Table | null;
  products: Product[];
  onComplete: (items: OrderItem[]) => void;
  onCancel: () => void;
}

const MODIFIERS = {
  'Coffee': ['Extra Shot', 'Decaf', 'Oat Milk', 'Almond Milk', 'No Sugar', 'Extra Hot'],
  'Tea': ['Extra Hot', 'Less Ice', 'No Sugar', 'Honey'],
  'Food': ['No Onion', 'Extra Spicy', 'Gluten Free', 'Vegan'],
  'Desserts': ['No Cream', 'Extra Chocolate', 'Warm'],
  'Beverages': ['Less Ice', 'No Ice', 'Extra Cold'],
};

const CATEGORIES = ['All', 'Coffee', 'Tea', 'Food', 'Desserts', 'Beverages'];

export function OrderPad({ table, products, onComplete, onCancel }: OrderPadProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : (Array.isArray(products) ? products : []).filter(p => p.category === selectedCategory);

  const orderTotal = orderItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleProductClick = (product: Product) => {
    const modifiersForCategory = MODIFIERS[product.category as keyof typeof MODIFIERS] || [];
    
    if (modifiersForCategory.length > 0) {
      setModifierProduct(product);
      setSelectedModifiers([]);
    } else {
      addItemToOrder(product, []);
    }
  };

  const addItemToOrder = (product: Product, modifiers: string[]) => {
    setOrderItems(prev => {
      const modifierKey = modifiers.sort().join(',');
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.modifiers.sort().join(',') === modifierKey
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
        return updated;
      }
      
      return [...prev, { product, quantity: 1, modifiers }];
    });
  };

  const handleModifierConfirm = () => {
    if (modifierProduct) {
      addItemToOrder(modifierProduct, selectedModifiers);
      setModifierProduct(null);
      setSelectedModifiers([]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    setOrderItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(0, updated[index].quantity + delta) };
      return (Array.isArray(updated) ? updated : []).filter(item => item.quantity > 0);
    });
  };

  const removeItem = (index: number) => {
    setOrderItems(prev => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
  };

  const handleSendToKitchen = () => {
    if (orderItems.length > 0) {
      onComplete(orderItems);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div>
          <h2 className="text-lg font-semibold">Table {table?.number}</h2>
          <p className="text-sm text-muted-foreground">New Order</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X size={20} />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Products Panel */}
        <div className="flex-1 flex flex-col border-r">
          {/* Category Tabs */}
          <div className="flex gap-2 p-3 overflow-x-auto border-b bg-muted/30">
            {(Array.isArray(CATEGORIES) ? CATEGORIES : []).map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="shrink-0"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Product Grid */}
          <ScrollArea className="flex-1 p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Array.isArray(filteredProducts) ? filteredProducts : []).map(product => (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  disabled={product.stock === 0}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all',
                    'hover:border-primary hover:bg-primary/5',
                    'active:scale-95',
                    product.stock === 0 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-2xl mb-1">{product.image || '🍽️'}</span>
                  <span className="text-sm font-medium text-center line-clamp-2">{product.name}</span>
                  <span className="text-sm text-primary font-semibold mt-1">
                    {formatCurrency(product.price)}
                  </span>
                  {product.stock !== undefined && product.stock < 5 && product.stock > 0 && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      Low: {product.stock}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Order Summary Panel */}
        <div className="w-80 flex flex-col bg-card">
          <div className="p-3 border-b">
            <h3 className="font-semibold">Current Order</h3>
            <p className="text-sm text-muted-foreground">{orderItems.length} items</p>
          </div>

          <ScrollArea className="flex-1 p-3">
            {orderItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p>No items yet</p>
                <p className="text-sm">Tap products to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(Array.isArray(orderItems) ? orderItems : []).map((item, index) => (
                  <div key={`${item.product.id}-${index}`} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.name}</p>
                        {item.modifiers.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {item.modifiers.join(', ')}
                          </p>
                        )}
                        <p className="text-sm text-primary font-semibold">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(index, -1)}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(index, 1)}
                      >
                        <Plus size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Order Actions */}
          <div className="p-3 border-t space-y-3">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{formatCurrency(orderTotal)}</span>
            </div>
            
            <Button 
              className="w-full h-12 text-lg gap-2" 
              disabled={orderItems.length === 0}
              onClick={handleSendToKitchen}
            >
              <Send size={18} />
              Send to Kitchen
            </Button>
          </div>
        </div>
      </div>

      {/* Modifier Dialog */}
      <Dialog open={!!modifierProduct} onOpenChange={(open) => !open && setModifierProduct(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{modifierProduct?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select modifiers (optional)</p>
            
            <div className="space-y-2">
              {(MODIFIERS[modifierProduct?.category as keyof typeof MODIFIERS] || []).map(modifier => (
                <label
                  key={modifier}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedModifiers.includes(modifier)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedModifiers(prev => [...prev, modifier]);
                      } else {
                        setSelectedModifiers(prev => (Array.isArray(prev) ? prev : []).filter(m => m !== modifier));
                      }
                    }}
                  />
                  <span>{modifier}</span>
                </label>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setModifierProduct(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleModifierConfirm}>
                Add to Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
