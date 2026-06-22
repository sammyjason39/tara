import React from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RetailStore } from "@/core/types/retail/retail";

type Props = {
  stores: RetailStore[];
  selectedStoreId: string;
  onStoreChange: (id: string) => void;
  lastSync: string;
  isLoading: boolean;
  canWrite: boolean;
  onSync: () => void;
};

export const InventoryPageHeader: React.FC<Props> = ({
  stores,
  selectedStoreId,
  onStoreChange,
  lastSync,
  isLoading,
  canWrite,
  onSync,
}) => {
  const selectedStore = stores.find((s) => s.id === selectedStoreId);

  return (
    <div className="flex items-center justify-between mb-4">
      <PageHeader
        title="Inventory Operations"
        subtitle={`${selectedStore?.name ?? "Select Store"} • Core Sync${
          lastSync ? ` • Last sync: ${lastSync}` : ""
        }`}
      />
      <div className="flex items-center gap-3">
        <Select value={selectedStoreId} onValueChange={onStoreChange}>
          <SelectTrigger className="w-52 h-10 rounded-xl font-black italic text-sm border-border">
            <SelectValue placeholder="Select Store" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {(Array.isArray(stores) ? stores : []).map((s) => (
              <SelectItem key={s.id} value={s.id} className="font-bold italic">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={onSync}
          disabled={isLoading}
          className="h-10 rounded-xl gap-2 font-black italic text-xs uppercase tracking-widest border-border"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isLoading && "animate-spin")}
          />{" "}
          Sync Core
        </Button>
        {!canWrite && (
          <Badge className="bg-warning text-warning border-warning font-black italic text-[10px] uppercase px-3 py-1 gap-1 flex items-center">
            <Lock className="w-3 h-3" /> View + Request Only
          </Badge>
        )}
      </div>
    </div>
  );
};
