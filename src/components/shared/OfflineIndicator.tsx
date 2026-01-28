import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';

interface OfflineIndicatorProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function OfflineIndicator({ className, showText = true, size = 'md' }: OfflineIndicatorProps) {
  const { state } = useApp();
  const { isOnline, pendingSyncCount } = state;

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2',
  };

  const iconSize = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  if (isOnline && pendingSyncCount === 0) {
    return (
      <div className={cn('flex items-center text-success', sizeClasses[size], className)}>
        <Wifi size={iconSize[size]} />
        {showText && <span>Online</span>}
      </div>
    );
  }

  if (isOnline && pendingSyncCount > 0) {
    return (
      <div className={cn('flex items-center text-warning', sizeClasses[size], className)}>
        <Cloud size={iconSize[size]} className="animate-pulse" />
        {showText && <span>Syncing ({pendingSyncCount})</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center text-destructive offline-pulse', sizeClasses[size], className)}>
      <WifiOff size={iconSize[size]} />
      {showText && <span>Offline</span>}
    </div>
  );
}
