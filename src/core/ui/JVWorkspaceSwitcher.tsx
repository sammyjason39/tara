import React, { useEffect, useState } from "react";
import { ChevronDown, Globe, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { financeService } from "@/core/services/finance/financeService";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function JVWorkspaceSwitcher() {
  const { session } = useAuth();
  const [participations, setParticipations] = useState<any[]>([]);
  const [currentJV, setCurrentJV] = useState<any>(null);

  useEffect(() => {
    if (session) {
      financeService.getJVParticipations(session).then(setParticipations);
      
      const saved = localStorage.getItem('zenvix_jv_context');
      if (saved) {
        setCurrentJV(JSON.parse(saved));
      }
    }
  }, [session]);

  const switchWorkspace = (participation: any) => {
    const context = {
      hostTenantId: participation.jv_profiles.tenant_id,
      branchId: participation.jv_profiles.scopes[0]?.branch_id,
      hostName: participation.jv_profiles.name,
    };
    localStorage.setItem('zenvix_jv_context', JSON.stringify(context));
    window.location.reload(); // Refresh to apply headers globally
  };

  const exitMirrorMode = () => {
    localStorage.removeItem('zenvix_jv_context');
    window.location.reload();
  };

  if (!participations.length && !currentJV) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-8 gap-2 border-dashed transition-all duration-300",
            currentJV ? "bg-amber-500/10 border-amber-500/50 text-amber-700 hover:bg-amber-500/20" : "hover:bg-accent"
          )}
        >
          <Globe className={cn("w-4 h-4", currentJV && "animate-pulse")} />
          <span className="hidden sm:inline font-medium">
            {currentJV ? `Viewing: ${currentJV.hostName}` : "Partner Workspaces"}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 glass-morphism border-gray-200/50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <DropdownMenuLabel className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 py-2">
          Joint Venture Mirror
        </DropdownMenuLabel>
        
        {currentJV && (
          <DropdownMenuItem 
            onClick={exitMirrorMode}
            className="text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer font-semibold"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Exit Mirror Mode
          </DropdownMenuItem>
        )}

        {participations.length > 0 && <DropdownMenuSeparator className="bg-gray-100" />}
        
        {participations.map((p) => {
          const isSelected = currentJV?.hostTenantId === p.jv_profiles.tenant_id;
          return (
            <DropdownMenuItem 
              key={p.id}
              onClick={() => switchWorkspace(p)}
              className="flex flex-col items-start gap-1 py-3 px-3 cursor-pointer group"
            >
              <div className="flex items-center justify-between w-full">
                <span className={cn("font-bold text-sm transition-colors", isSelected ? "text-indigo-600" : "text-gray-900 group-hover:text-indigo-600")}>
                  {p.jv_profiles.name}
                </span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 animate-in zoom-in" />}
              </div>
              <span className="text-[10px] text-gray-500 leading-tight">
                Role: {p.role} • Scope: {p.jv_profiles.scopes[0]?.branch_id ? "Branch-Level" : "Company-Level"}
              </span>
            </DropdownMenuItem>
          );
        })}

        {participations.length === 0 && !currentJV && (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-gray-400 italic">No partner invitations found</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
