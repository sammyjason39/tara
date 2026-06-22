import React from "react";
import {
  Store,
  Globe,
  ChevronDown,
  Check,
  Layers,
  Building2,
  ShoppingBag,
} from "lucide-react";
import { useRetail } from "../context/RetailContext";
import { useSession } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const RetailContextSwitcher = () => {
  const session = useSession();
  const {
    activeStore,
    activeChannel,
    stores,
    channels,
    setStore,
    setChannel,
    mode,
    activeShift,
  } = useRetail();

  // Expanded RBAC: Allow ADMIN and those with MANAGE_RETAIL permission
  const canSwitch =
    session.role === Roles.OWNER ||
    session.role === Roles.SUPERADMIN ||
    session.role === Roles.COMPANY_ADMIN ||
    (session.permissions || []).includes("MANAGE_RETAIL");

  // Operational focus: Prevent switching if a shift is currently active
  const isLocked = mode === "operational" && !!activeShift;

  const currentSelection =
    activeStore?.name || activeChannel?.name || "Select Context";
  const isChannel = !!activeChannel;

  if (!canSwitch || isLocked) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 ${isLocked ? "bg-primary/5 border border-primary" : "bg-secondary/10"} rounded-xl`}>
        {isChannel ? (
          <Globe className={`w-4 h-4 ${isLocked ? "text-primary" : "text-muted-foreground"}`} />
        ) : (
          <Store className={`w-4 h-4 ${isLocked ? "text-primary" : "text-muted-foreground"}`} />
        )}
        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-tighter ${isLocked ? "text-primary" : "text-foreground"}`}>
            {activeStore?.name || activeChannel?.name || "No Active Context"}
          </span>
          {isLocked && (
            <span className="text-[8px] font-bold text-primary uppercase tracking-widest leading-none">
              Shift Active · Context Locked
            </span>
          )}
        </div>
      </div>
    );
  }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-12 border-2 border-border rounded-2xl flex items-center gap-3 px-4 hover:bg-secondary/5 hover:border-primary transition-all shadow-sm"
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${isChannel ? "bg-primary/10 text-primary" : "bg-primary text-primary"}`}
          >
            {isChannel ? (
              <Globe className="w-5 h-5" />
            ) : (
              <Store className="w-5 h-5" />
            )}
          </div>
          <div className="text-left hidden md:block">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-1">
              Active Entity
            </div>
            <div className="text-xs font-black italic uppercase tracking-tighter text-foreground flex items-center gap-1">
              {currentSelection}
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-64 rounded-2xl p-2 shadow-2xl border-2 border-border"
        align="start"
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Retail Governance
          </div>
          <div className="text-xs font-bold italic mt-1">
            Switch Managed Presence
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuGroup>
          <div className="px-3 py-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Building2 className="w-3 h-3" />
            Physical Branches
          </div>
          {(Array.isArray(stores) ? stores : []).map((store) => (
            <DropdownMenuItem
              key={store.id}
              onSelect={() => setStore(store.id)}
              className="rounded-xl flex items-center justify-between p-3 cursor-pointer mt-1"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${activeStore?.id === store.id ? "bg-primary/50 animate-pulse" : "bg-muted/20"}`}
                />
                <span
                  className={`text-xs font-bold ${activeStore?.id === store.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  {store.name}
                </span>
              </div>
              {activeStore?.id === store.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2" />

        <DropdownMenuGroup>
          <div className="px-3 py-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <ShoppingBag className="w-3 h-3" />
            Ecommerce Channels
          </div>
          {(Array.isArray(channels) ? channels : []).map((channel) => (
            <DropdownMenuItem
              key={channel.id}
              onSelect={() => setChannel(channel.id)}
              className="rounded-xl flex items-center justify-between p-3 cursor-pointer mt-1"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${activeChannel?.id === channel.id ? "bg-primary animate-pulse" : "bg-muted/20"}`}
                />
                <span
                  className={`text-xs font-bold ${activeChannel?.id === channel.id ? "text-primary" : "text-muted-foreground"}`}
                >
                  {channel.name}
                </span>
              </div>
              {activeChannel?.id === channel.id && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        {stores.length === 0 && channels.length === 0 && (
          <div className="p-4 text-center">
            <Badge variant="outline" className="text-[9px] text-muted-foreground">
              No managed hubs found
            </Badge>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
