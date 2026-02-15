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
import { LayoutDashboard, ShoppingCart, Coffee, ChevronDown, Puzzle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getAllModuleContracts } from '@/core/runtime/moduleRegistry';

interface AppSwitcherProps {
  className?: string;
}

const coreApps = [
  { id: 'core', name: 'Core System', icon: LayoutDashboard, path: '/core', color: 'text-primary' },
];

export function AppSwitcher({ className }: AppSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { switchApp } = useApp();
  const modules = getAllModuleContracts();

  const dynamicApps = modules.map(m => ({
    id: m.id,
    name: m.name,
    icon: m.id === 'retail' ? ShoppingCart : Puzzle,
    path: `/m/${m.id}/${m.getPages(m.getDefaultConfig())[0]?.id || ''}`,
    color: 'text-success',
  }));

  const allApps = [...coreApps, ...dynamicApps];
  const currentApp = allApps.find(app => location.pathname.startsWith(app.path)) || allApps[0];
  const CurrentIcon = currentApp.icon;

  const handleAppSwitch = (app: typeof allApps[number]) => {
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
          <CurrentIcon size={20} className={(currentApp as any).color} />
          <span className="hidden sm:inline">{currentApp.name}</span>
          <ChevronDown size={16} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {allApps.map((app, index) => {
          const Icon = app.icon;
          const isActive = currentApp.id === app.id;
          return (
            <div key={app.id}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => handleAppSwitch(app)}
                className={cn('gap-2 cursor-pointer', isActive && 'bg-accent')}
              >
                <Icon size={18} className={(app as any).color} />
                <span>{app.name}</span>
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
