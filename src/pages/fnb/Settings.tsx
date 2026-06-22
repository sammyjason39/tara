import { useState } from 'react';
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from '@/hooks/use-toast';
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

  const handleToggle = (key: keyof typeof settings, label: string, value: boolean) => {
    handleSettingChange(key, value);
    toast({
      title: 'Setting updated',
      description: `${label} ${value ? 'enabled' : 'disabled'}`,
    });
  };

  const handleTestPrint = () => {
    window.print();
    toast({
      title: 'Test print sent',
      description: 'A test receipt was sent to the receipt printer',
    });
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold">Cafe Settings</h1>

      {/* Kitchen Display Settings */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <ChefHat size={20} />
            Kitchen Display
          </GlassCardTitle>
          <GlassCardDescription>Configure kitchen display system behavior</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Kitchen Alerts</Label>
              <p className="text-sm text-muted-foreground">Show visual alerts for delayed orders</p>
            </div>
            <Switch
              checked={settings.kitchenAlerts}
              onCheckedChange={(checked) => handleToggle('kitchenAlerts', 'Kitchen Alerts', checked)}
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
              onCheckedChange={(checked) => handleToggle('orderSounds', 'Order Sounds', checked)}
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
        </GlassCardContent>
      </GlassCard>

      {/* Table Management */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Clock size={20} />
            Table Management
          </GlassCardTitle>
          <GlassCardDescription>Configure table behavior</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
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
        </GlassCardContent>
      </GlassCard>

      {/* Billing Settings */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <DollarSign size={20} />
            Billing
          </GlassCardTitle>
          <GlassCardDescription>Configure billing and tax settings</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
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
              onCheckedChange={(checked) => handleToggle('autoPrintReceipts', 'Auto-Print Receipts', checked)}
            />
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Appearance */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Palette size={20} />
            Appearance
          </GlassCardTitle>
          <GlassCardDescription>Customize the display</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
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
        </GlassCardContent>
      </GlassCard>

      {/* Hardware */}
      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle className="flex items-center gap-2">
            <Printer size={20} />
            Hardware
          </GlassCardTitle>
          <GlassCardDescription>Connected devices</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent className="space-y-4">
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

          <Button onClick={(e) => { e.preventDefault(); handleTestPrint(); }} variant="outline" className="w-full">
            Test Print
          </Button>
        </GlassCardContent>
      </GlassCard>
    </div>
  );
}

