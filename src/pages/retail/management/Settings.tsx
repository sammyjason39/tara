import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Barcode,
  Printer,
  Receipt,
  CreditCard,
  Scale,
  Bell,
  Settings2,
  Save,
  RotateCcw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/core/api/apiClient';
import { useSession } from '@/core/security/session';

export default function RetailSettings() {
  const session = useSession();
  const [settings, setSettings] = useState({
    // Scanner settings
    scannerEnabled: true,
    scannerBeep: true,
    autoAddOnScan: true,
    
    // Receipt settings
    printReceipt: true,
    emailReceipt: false,
    receiptFooter: 'Thank you for shopping with us!',
    
    // Tax settings
    taxRate: '8.00',
    taxInclusive: false,
    
    // Payment settings
    cashEnabled: true,
    cardEnabled: true,
    mobileEnabled: true,
    defaultPayment: 'card',
    
    // Inventory settings
    lowStockAlert: true,
    lowStockThreshold: '10',
    autoDeductStock: true,
    
    // Display settings
    showBarcode: true,
    showStock: true,
    gridColumns: '4',
  });

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Your retail POS settings have been updated.',
    });
  };

  const handleReset = () => {
    toast({
      title: 'Settings reset',
      description: 'Settings have been restored to defaults.',
    });
  };

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Retail POS Settings</h2>
          <p className="text-muted-foreground">
            Configure your retail point of sale preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {/* Barcode Scanner Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Barcode Scanner
            </CardTitle>
            <CardDescription>
              Configure barcode scanner behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Scanner</Label>
                <p className="text-sm text-muted-foreground">
                  Allow barcode scanning for product lookup
                </p>
              </div>
              <Switch
                checked={settings.scannerEnabled}
                onCheckedChange={(v) => updateSetting('scannerEnabled', v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Scanner Beep</Label>
                <p className="text-sm text-muted-foreground">
                  Play sound on successful scan
                </p>
              </div>
              <Switch
                checked={settings.scannerBeep}
                onCheckedChange={(v) => updateSetting('scannerBeep', v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Add on Scan</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically add scanned items to cart
                </p>
              </div>
              <Switch
                checked={settings.autoAddOnScan}
                onCheckedChange={(v) => updateSetting('autoAddOnScan', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Receipt Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Receipts
            </CardTitle>
            <CardDescription>
              Receipt printing and email options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Print Receipt</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically print receipt after sale
                </p>
              </div>
              <Switch
                checked={settings.printReceipt}
                onCheckedChange={(v) => updateSetting('printReceipt', v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Receipt Option</Label>
                <p className="text-sm text-muted-foreground">
                  Offer email receipt at checkout
                </p>
              </div>
              <Switch
                checked={settings.emailReceipt}
                onCheckedChange={(v) => updateSetting('emailReceipt', v)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Receipt Footer Message</Label>
              <Input
                value={settings.receiptFooter}
                onChange={(e) => updateSetting('receiptFooter', e.target.value)}
                placeholder="Thank you message..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Tax Configuration
            </CardTitle>
            <CardDescription>
              Sales tax rate and calculation method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.taxRate}
                  onChange={(e) => updateSetting('taxRate', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between pt-6">
                <div>
                  <Label>Tax Inclusive Pricing</Label>
                  <p className="text-sm text-muted-foreground">
                    Prices include tax
                  </p>
                </div>
                <Switch
                  checked={settings.taxInclusive}
                  onCheckedChange={(v) => updateSetting('taxInclusive', v)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Enable payment options and set defaults
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Cash</Label>
                <Switch
                  checked={settings.cashEnabled}
                  onCheckedChange={(v) => updateSetting('cashEnabled', v)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Card</Label>
                <Switch
                  checked={settings.cardEnabled}
                  onCheckedChange={(v) => updateSetting('cardEnabled', v)}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Mobile</Label>
                <Switch
                  checked={settings.mobileEnabled}
                  onCheckedChange={(v) => updateSetting('mobileEnabled', v)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Default Payment Method</Label>
              <Select
                value={settings.defaultPayment}
                onValueChange={(v) => updateSetting('defaultPayment', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile">Mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Inventory Alerts
            </CardTitle>
            <CardDescription>
              Stock management and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when stock is running low
                </p>
              </div>
              <Switch
                checked={settings.lowStockAlert}
                onCheckedChange={(v) => updateSetting('lowStockAlert', v)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) => updateSetting('lowStockThreshold', e.target.value)}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Alert when stock falls below this number
              </p>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Deduct Stock</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically reduce inventory on sale
                </p>
              </div>
              <Switch
                checked={settings.autoDeductStock}
                onCheckedChange={(v) => updateSetting('autoDeductStock', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Display Options
            </CardTitle>
            <CardDescription>
              Product grid display preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Barcode</Label>
                <p className="text-sm text-muted-foreground">
                  Display barcode on product cards
                </p>
              </div>
              <Switch
                checked={settings.showBarcode}
                onCheckedChange={(v) => updateSetting('showBarcode', v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Show Stock Level</Label>
                <p className="text-sm text-muted-foreground">
                  Display available stock on product cards
                </p>
              </div>
              <Switch
                checked={settings.showStock}
                onCheckedChange={(v) => updateSetting('showStock', v)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Grid Columns</Label>
              <Select
                value={settings.gridColumns}
                onValueChange={(v) => updateSetting('gridColumns', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                  <SelectItem value="5">5 Columns</SelectItem>
                  <SelectItem value="6">6 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Connected Hardware */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Connected Hardware
            </CardTitle>
            <CardDescription>
              Manage connected POS devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success">
                    <Printer className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Receipt Printer</p>
                    <p className="text-sm text-muted-foreground">Epson TM-T88VI</p>
                  </div>
                </div>
                <span className="text-sm text-success font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success">
                    <Barcode className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium">Barcode Scanner</p>
                    <p className="text-sm text-muted-foreground">Honeywell Voyager</p>
                  </div>
                </div>
                <span className="text-sm text-success font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Card Terminal</p>
                    <p className="text-sm text-muted-foreground">No device paired</p>
                  </div>
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      await apiRequest("/retail/settings/discovery", "POST", session);
                      toast({ title: "Discovery Initialized", description: "Scanning for BLE/Network terminals in region..." });
                    } catch (e) {
                      toast({ title: "Discovery Failed", description: "Could not initiate device discovery.", variant: "destructive" });
                    }
                  }}
                  variant="outline" 
                  size="sm"
                >
                  Pair Device
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
