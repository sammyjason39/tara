import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, Sparkles } from 'lucide-react';

type LicenseStatus = 'active' | 'trial' | 'expired' | 'upgrade';

interface LicenseBadgeProps {
  status: LicenseStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<LicenseStatus, { label: string; icon: typeof CheckCircle; className: string }> = {
  active: {
    label: 'Active',
    icon: CheckCircle,
    className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
  },
  trial: {
    label: 'Trial',
    icon: Clock,
    className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
  },
  expired: {
    label: 'Expired',
    icon: AlertTriangle,
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  },
  upgrade: {
    label: 'Upgrade',
    icon: Sparkles,
    className: 'bg-info/10 text-info border-info/20 hover:bg-info/20',
  },
};

export function LicenseBadge({ status, className, showIcon = true }: LicenseBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 font-medium', config.className, className)}
    >
      {showIcon && <Icon size={12} />}
      {config.label}
    </Badge>
  );
}
