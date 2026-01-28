import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LayoutDashboard, ShoppingCart, Coffee, ChevronDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface AppSwitcherProps {
  className?: string;
}

const apps = [
  { id: 'core', name: 'Core System', icon: LayoutDashboard, path: '/core', color: 'text-primary' },
  { id: 'pos-retail', name: 'POS Retail', icon: ShoppingCart, path: '/pos-retail', color: 'text-success' },
  { id: 'pos-cafe', name: 'POS Cafe', icon: Coffee, path: '/pos-cafe', color: 'text-warning' },
] as const;

export function AppSwitcher({ className }: AppSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, switchApp } = useApp();

  const currentApp = apps.find(app => location.pathname.startsWith(app.path)) || apps[0];
  const CurrentIcon = currentApp.icon;

  const handleAppSwitch = (app: typeof apps[number]) => {
    switchApp(app.id);
    navigate(app.path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn('gap-2 font-semibold', className)}
        >
          <CurrentIcon size={20} className={currentApp.color} />
          <span className="hidden sm:inline">{currentApp.name}</span>
          <ChevronDown size={16} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {apps.map((app, index) => {
          const Icon = app.icon;
          const isActive = currentApp.id === app.id;
          return (
            <div key={app.id}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => handleAppSwitch(app)}
                className={cn('gap-2 cursor-pointer', isActive && 'bg-accent')}
              >
                <Icon size={18} className={app.color} />
                <span>{app.name}</span>
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
