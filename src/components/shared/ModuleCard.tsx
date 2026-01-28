import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { LicenseBadge } from './LicenseBadge';
import { Lock, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';

interface ModuleCardProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  licenseStatus: 'active' | 'trial' | 'expired' | 'upgrade';
  onToggle?: (enabled: boolean) => void;
  onUpgrade?: () => void;
  className?: string;
}

export function ModuleCard({
  id,
  name,
  description,
  icon,
  enabled,
  licenseStatus,
  onToggle,
  onUpgrade,
  className,
}: ModuleCardProps) {
  // Dynamically get icon from lucide-react
  const IconComponent = (Icons as any)[icon] || Icons.Package;
  
  const isLocked = licenseStatus === 'expired' || licenseStatus === 'upgrade';
  const canToggle = licenseStatus === 'active' || licenseStatus === 'trial';

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        enabled && canToggle && 'ring-2 ring-primary/20',
        isLocked && 'opacity-75',
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-lg',
                enabled && canToggle
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <IconComponent size={22} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{name}</h3>
              <LicenseBadge status={licenseStatus} className="mt-1" />
            </div>
          </div>
          
          {canToggle ? (
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              aria-label={`Toggle ${name}`}
            />
          ) : (
            <Lock size={18} className="text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
        
        {isLocked && onUpgrade && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={onUpgrade}
          >
            <Sparkles size={14} />
            {licenseStatus === 'expired' ? 'Renew License' : 'Upgrade Now'}
          </Button>
        )}
      </CardContent>

      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] pointer-events-none" />
      )}
    </Card>
  );
}
