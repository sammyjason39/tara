import React from "react";
import {
  ShieldCheck,
  ChevronRight,
  Store,
  Globe,
  PlusCircle,
} from "lucide-react";
import { useRetail } from "../context/RetailContext";
import { useSession } from "@/core/security/session";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const RetailGlobalAdminBar = () => {
  const {
    activeStore,
    activeChannel,
    stores,
    channels,
    setStore,
    setChannel,
    mode,
  } = useRetail();
  const session = useSession();

  return (
    <div className="bg-slate-900 text-white h-10 px-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest border-b border-white/10 z-[60]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-blue-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Zenvix Superadmin control
        </div>
        <Separator orientation="vertical" className="h-4 bg-white/20" />
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Tenant:</span>
          <span className="text-white">{session.tenant_id}</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Active Entity:</span>
          {activeStore ? (
            <Store className="w-3 h-3 text-indigo-400" />
          ) : (
            <Globe className="w-3 h-3 text-cyan-400" />
          )}
          <span className="text-white">
            {activeStore?.name || activeChannel?.name || "Global Scope"}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 hover:bg-white/10 text-[9px] font-black italic"
              >
                [ Switch ]
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 bg-white border-2 border-slate-900 shadow-2xl rounded-xl"
            >
              <DropdownMenuLabel className="text-[10px] uppercase font-black italic tracking-widest text-slate-400">
                Physical Stores
              </DropdownMenuLabel>
              {(Array.isArray(stores) ? stores : []).map((store) => (
                <DropdownMenuItem
                  key={store.id}
                  className="gap-2 focus:bg-indigo-50 cursor-pointer"
                  onClick={() => setStore(store.id)}
                >
                  <Store className="w-4 h-4 text-indigo-500" />
                  <span className="font-bold text-slate-900">{store.name}</span>
                  {activeStore?.id === store.id && (
                    <ShieldCheck className="w-3 h-3 ml-auto text-green-500" />
                  )}
                </DropdownMenuItem>
              ))}
              {stores.length === 0 && (
                <DropdownMenuItem
                  disabled
                  className="text-[10px] text-slate-400 italic"
                >
                  No stores found
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase font-black italic tracking-widest text-slate-400">
                Digital Channels
              </DropdownMenuLabel>
              {(Array.isArray(channels) ? channels : []).map((channel) => (
                <DropdownMenuItem
                  key={channel.id}
                  className="gap-2 focus:bg-cyan-50 cursor-pointer"
                  onClick={() => setChannel(channel.id)}
                >
                  <Globe className="w-4 h-4 text-cyan-500" />
                  <span className="font-bold text-slate-900">
                    {channel.name}
                  </span>
                  {activeChannel?.id === channel.id && (
                    <ShieldCheck className="w-3 h-3 ml-auto text-green-500" />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-indigo-600 focus:bg-indigo-50 font-black italic uppercase text-[10px] tracking-tighter"
                onClick={() =>
                  (window.location.href = "/m/retail/management/profile")
                }
              >
                <PlusCircle className="w-4 h-4" />
                Provision New Branch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Mode:</span>
          <span
            className={
              mode === "management" ? "text-blue-400" : "text-indigo-400"
            }
          >
            {mode} plane
          </span>
        </div>
        <Separator orientation="vertical" className="h-4 bg-white/20" />
        <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
          <Globe className="w-3 h-3 text-green-500" />
          Authority: Operational
        </div>
      </div>
    </div>
  );
};
