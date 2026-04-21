import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useApp } from '@/contexts/AppContext';
import { 
  Printer, 
  Bell, 
  Clock, 
  DollarSign, 
  Volume2, 
  Palette,
  ChefHat,
  Receipt
} from 'lucide-react';

export default function CafeSettings() {
  const { state, toggleTheme } = useApp();
  const [settings, setSettings] = useState({
    kitchenAlerts: true,
    orderSounds: true,
    autoPrintReceipts: false,
    rushOrderThreshold: 10,
    defaultTaxRate: 10,
    tableCleaningTime: 5,
  });

  const handleSettingChange = (key: keyof typeof settings, value: boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Cafe Settings</h1>

      {/* Kitchen Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat size={20} />
            Kitchen Display
          </CardTitle>
          <CardDescription>Configure kitchen display system behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Kitchen Alerts</Label>
              <p className="text-sm text-muted-foreground">Show visual alerts for delayed orders</p>
            </div>
            <Switch
              checked={settings.kitchenAlerts}
              onCheckedChange={(checked) => handleSettingChange('kitchenAlerts', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Order Sounds</Label>
              <p className="text-sm text-muted-foreground">Play sound for new orders</p>
            </div>
            <Switch
              checked={settings.orderSounds}
              onCheckedChange={(checked) => handleSettingChange('orderSounds', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock size={16} />
              Rush Order Threshold (minutes)
            </Label>
            <Input
              type="number"
              value={settings.rushOrderThreshold}
              onChange={(e) => handleSettingChange('rushOrderThreshold', parseInt(e.target.value) || 10)}
              min={5}
              max={30}
            />
            <p className="text-xs text-muted-foreground">
              Orders exceeding this time will be marked as delayed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            Table Management
          </CardTitle>
          <CardDescription>Configure table behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Table Cleaning Time (minutes)</Label>
            <Input
              type="number"
              value={settings.tableCleaningTime}
              onChange={(e) => handleSettingChange('tableCleaningTime', parseInt(e.target.value) || 5)}
              min={1}
              max={15}
            />
            <p className="text-xs text-muted-foreground">
              Time before tables automatically become available after payment
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Billing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign size={20} />
            Billing
          </CardTitle>
          <CardDescription>Configure billing and tax settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Tax Rate (%)</Label>
            <Input
              type="number"
              value={settings.defaultTaxRate}
              onChange={(e) => handleSettingChange('defaultTaxRate', parseInt(e.target.value) || 10)}
              min={0}
              max={25}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Print Receipts</Label>
              <p className="text-sm text-muted-foreground">Print receipt after each payment</p>
            </div>
            <Switch
              checked={settings.autoPrintReceipts}
              onCheckedChange={(checked) => handleSettingChange('autoPrintReceipts', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette size={20} />
            Appearance
          </CardTitle>
          <CardDescription>Customize the display</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Use dark theme for the POS</p>
            </div>
            <Switch
              checked={state.theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>
        </CardContent>
      </Card>

      {/* Hardware */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer size={20} />
            Hardware
          </CardTitle>
          <CardDescription>Connected devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Receipt size={20} className="text-muted-foreground" />
              <div>
                <p className="font-medium">Receipt Printer</p>
                <p className="text-sm text-muted-foreground">EPSON TM-T88VI</p>
              </div>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <ChefHat size={20} className="text-muted-foreground" />
              <div>
                <p className="font-medium">Kitchen Display</p>
                <p className="text-sm text-muted-foreground">Station 1</p>
              </div>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>

          <Button onClick={(e) => { e.preventDefault(); window.print(); }} variant="outline" className="w-full">
            Test Print
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Badge variant helper
function Badge({ variant, children, className }: { variant: 'success' | 'outline'; children: React.ReactNode; className?: string }) {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
  const variantClass = variant === 'success' 
    ? 'bg-success/20 text-success' 
    : 'border border-border text-muted-foreground';
  
  return <span className={`${baseClass} ${variantClass} ${className || ''}`}>{children}</span>;
}
