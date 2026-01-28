import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5 border-primary/20',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
  destructive: 'bg-destructive/5 border-destructive/20',
};

const iconVariantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
  variant = 'default',
}: StatCardProps) {
  const TrendIcon = trend !== undefined
    ? trend > 0
      ? TrendingUp
      : trend < 0
        ? TrendingDown
        : Minus
    : null;

  const trendColor = trend !== undefined
    ? trend > 0
      ? 'text-success'
      : trend < 0
        ? 'text-destructive'
        : 'text-muted-foreground'
    : '';

  return (
    <Card className={cn('card-hover', variantStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend !== undefined && TrendIcon && (
              <div className={cn('flex items-center gap-1 mt-1 text-sm', trendColor)}>
                <TrendIcon size={14} />
                <span>{Math.abs(trend)}%</span>
                {trendLabel && (
                  <span className="text-muted-foreground">{trendLabel}</span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn('p-2 rounded-lg', iconVariantStyles[variant])}>
              <Icon size={20} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
