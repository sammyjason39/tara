import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  ShoppingCart,
  Package,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockRetailProducts, Product, formatCurrency } from '@/lib/mock-data';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';

interface CartItem {
  product: Product;
  quantity: number;
}

const retailCategories = ['All', 'Coffee', 'Merchandise', 'Gift Cards', 'Equipment'];

export default function RetailSales() {
  const { state, addToCart, removeFromCart, clearCart } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'card' | 'mobile' | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Product categorization helper
  const getCategoryForProduct = (product: Product): string => {
    if (product.name.toLowerCase().includes('coffee') || product.name.toLowerCase().includes('bean')) {
      return 'Coffee';
    }
    if (product.name.toLowerCase().includes('gift card')) {
      return 'Gift Cards';
    }
    if (product.name.toLowerCase().includes('press') || product.name.toLowerCase().includes('pour') || product.name.toLowerCase().includes('set')) {
      return 'Equipment';
    }
    return 'Merchandise';
  };

  // Filter products
  const filteredProducts = (Array.isArray(mockRetailProducts) ? mockRetailProducts : []).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || getCategoryForProduct(product) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle barcode scan
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      const product = mockRetailProducts.find((p) => p.barcode === barcodeInput.trim());
      if (product) {
        addToCartLocal(product);
        toast({
          title: 'Product added',
          description: `${product.name} added to cart`,
        });
      } else {
        toast({
          title: 'Product not found',
          description: `No product with barcode ${barcodeInput}`,
          variant: 'destructive',
        });
      }
      setBarcodeInput('');
    }
  };

  // Cart operations
  const addToCartLocal = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return (Array.isArray(prev) ? prev : []).map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return (Array.isArray(prev) ? prev : []).map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCartLocal = (productId: string) => {
    setCart((prev) => (Array.isArray(prev) ? prev : []).filter((item) => item.product.id !== productId));
  };

  const clearCartLocal = () => {
    setCart([]);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Handle checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add items before checkout',
        variant: 'destructive',
      });
      return;
    }
    setIsCheckoutOpen(true);
  };

  const completeTransaction = () => {
    if (!selectedPayment) {
      toast({
        title: 'Select payment method',
        description: 'Choose cash, card, or mobile payment',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Transaction complete',
      description: `Payment of ${formatCurrency(total)} received via ${selectedPayment}`,
    });

    clearCartLocal();
    setIsCheckoutOpen(false);
    setSelectedPayment(null);
  };

  return (
    <div className="flex h-full">
      {/* Product Grid Area */}
      <div className="flex-1 flex flex-col p-4 space-y-4">
        {/* Search and Barcode */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={barcodeInputRef}
              placeholder="Scan barcode or enter code..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              className="pl-10 h-12 text-lg font-mono"
            />
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(Array.isArray(retailCategories) ? retailCategories : []).map((category) => (
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
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {(Array.isArray(filteredProducts) ? filteredProducts : []).map((product) => (
              <Card
                key={product.id}
                className="p-3 cursor-pointer hover:border-primary transition-colors touch-target"
                onClick={() => addToCartLocal(product)}
              >
                <div className="aspect-square bg-muted rounded-lg mb-2 flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
                <h4 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </h4>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold text-primary">
                    {formatCurrency(product.price)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {product.stock} in stock
                  </Badge>
                </div>
                {product.barcode && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {product.barcode}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Sidebar */}
      <div className="w-80 lg:w-96 bg-card border-l flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="font-semibold">Cart</h3>
              {itemCount > 0 && (
                <Badge>{itemCount}</Badge>
              )}
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCartLocal}
                className="text-destructive hover:text-destructive"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Cart is empty</p>
                <p className="text-sm">Scan or tap products to add</p>
              </div>
            ) : (
              (Array.isArray(cart) ? cart : []).map((item) => (
                <Card key={item.product.id} className="p-3">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-primary font-semibold">
                        {formatCurrency(item.product.price)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive shrink-0"
                      onClick={() => removeFromCartLocal(item.product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Cart Footer */}
        <div className="p-4 border-t space-y-3 bg-muted/50">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax (8%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          <Button
            className="w-full h-14 text-lg"
            size="lg"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Checkout
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(total)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {itemCount} item{itemCount !== 1 ? 's' : ''}
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Select Payment Method</p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={selectedPayment === 'cash' ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setSelectedPayment('cash')}
                >
                  <Banknote className="h-6 w-6" />
                  <span>Cash</span>
                </Button>
                <Button
                  variant={selectedPayment === 'card' ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setSelectedPayment('card')}
                >
                  <CreditCard className="h-6 w-6" />
                  <span>Card</span>
                </Button>
                <Button
                  variant={selectedPayment === 'mobile' ? 'default' : 'outline'}
                  className="h-20 flex-col gap-2"
                  onClick={() => setSelectedPayment('mobile')}
                >
                  <Smartphone className="h-6 w-6" />
                  <span>Mobile</span>
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={completeTransaction} disabled={!selectedPayment}>
              <Check className="mr-2 h-4 w-4" />
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
