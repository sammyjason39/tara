import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type StatusType = 
  | 'pending' | 'in-progress' | 'completed'  // Task status
  | 'open' | 'investigating' | 'resolved'    // Incident status
  | 'new' | 'preparing' | 'ready' | 'served' | 'billed'  // Order status
  | 'empty' | 'ordering'  // Table status
  | 'active' | 'inactive' // Staff status
  | 'low' | 'medium' | 'high' | 'critical'; // Priority levels

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  // Task statuses
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
  'in-progress': { label: 'In Progress', className: 'bg-info/10 text-info border-info/20' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  
  // Incident statuses
  open: { label: 'Open', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  investigating: { label: 'Investigating', className: 'bg-warning/10 text-warning border-warning/20' },
  resolved: { label: 'Resolved', className: 'bg-success/10 text-success border-success/20' },
  
  // Order statuses
  new: { label: 'New', className: 'bg-info/10 text-info border-info/20' },
  preparing: { label: 'Preparing', className: 'bg-warning/10 text-warning border-warning/20' },
  ready: { label: 'Ready', className: 'bg-success/10 text-success border-success/20' },
  served: { label: 'Served', className: 'bg-muted text-muted-foreground' },
  billed: { label: 'Billed', className: 'bg-primary/10 text-primary border-primary/20' },
  
  // Table statuses
  empty: { label: 'Empty', className: 'bg-muted text-muted-foreground' },
  ordering: { label: 'Ordering', className: 'bg-warning/10 text-warning border-warning/20' },
  
  // Staff statuses
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground' },
  
  // Priority levels
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-warning/10 text-warning border-warning/20' },
  high: { label: 'High', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  critical: { label: 'Critical', className: 'bg-destructive text-destructive-foreground' },
};

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        config.className,
        size === 'sm' && 'text-xs px-1.5 py-0',
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
