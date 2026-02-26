import React from "react";
import {
  Globe,
  ShoppingBag,
  AlertCircle,
  RefreshCw,
  ShieldOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { CredentialField } from "./SharedUI";
import { Roles } from "@/core/security/roles";
import type { ChannelRecord } from "@/core/services/retail/ecommerceHubService";

interface ChannelDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedChannel: ChannelRecord | null;
  detailName: string;
  setDetailName: (val: string) => void;
  detailSyncFreq: string;
  setDetailSyncFreq: (val: string) => void;
  detailSettings: any;
  setDetailSettings: (val: any) => void;
  detailClientId: string;
  detailClientSecret: string;
  approvalStatus: string;
  approvalRequestId: string | null;
  canEdit: boolean;
  isSaving: boolean;
  rotationLoading: string | null;
  revocationLoading: string | null;
  session: any;
  branchIds: string[];
  gatewayUrl: string;
  handleRotateChannel: (id: string, options: { showDialog?: boolean }) => void;
  handleRevokeChannel: (id: string) => void;
  handleDelete: (id: string) => void;
  handleSaveChannel: () => void;
  handleRequestApproval: () => void;
  copyCredential: (value: string, label: string) => void;
}

export const ChannelDetailDialog = ({
  isOpen,
  onOpenChange,
  selectedChannel,
  detailName,
  setDetailName,
  detailSyncFreq,
  setDetailSyncFreq,
  detailSettings,
  setDetailSettings,
  detailClientId,
  detailClientSecret,
  approvalStatus,
  approvalRequestId,
  canEdit,
  isSaving,
  rotationLoading,
  revocationLoading,
  session,
  branchIds,
  gatewayUrl,
  handleRotateChannel,
  handleRevokeChannel,
  handleDelete,
  handleSaveChannel,
  handleRequestApproval,
  copyCredential,
}: ChannelDetailDialogProps) => {
  if (!selectedChannel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900 p-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                {selectedChannel.type === "OWNED" ? (
                  <Globe className="w-6 h-6 text-indigo-300" />
                ) : (
                  <ShoppingBag className="w-6 h-6 text-emerald-300" />
                )}
                {selectedChannel.name || "Channel Setup"}
              </DialogTitle>
              <DialogDescription className="text-slate-300 mt-2 text-sm">
                View setup details, rotate secrets, and manage sync rules for
                this connector.
              </DialogDescription>
            </div>
            <Badge
              className={`text-[9px] font-black uppercase tracking-widest ${
                selectedChannel.status === "active"
                  ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40"
                  : "bg-slate-700/40 text-slate-200 border border-slate-600"
              }`}
            >
              {selectedChannel.status}
            </Badge>
          </div>
          <div className="mt-4 text-[11px] text-slate-300">
            Record ID:{" "}
            <span className="font-mono text-slate-100">
              {selectedChannel.id}
            </span>
          </div>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="grid gap-5 md:grid-cols-2">
            <CredentialField
              label="Tenant ID"
              value={selectedChannel.tenantId ?? session.tenantId}
              tooltip="Tenant ID identifies the business tenant inside Zenvix."
              helperText="Scope for this connector."
              copyable
              onCopy={() =>
                copyCredential(
                  selectedChannel.tenantId ?? session.tenantId,
                  "Tenant ID",
                )
              }
            />
            <CredentialField
              label="Branch IDs"
              value={
                (selectedChannel as any).branchIds?.join(", ") ??
                (selectedChannel as any).branchId ??
                branchIds.join(", ")
              }
              tooltip="Branch IDs identify the physical stores or branches this channel belongs to."
              helperText="Fulfillment branches."
              copyable
              onCopy={() =>
                copyCredential(
                  (selectedChannel as any).branchIds?.join(", ") ??
                    (selectedChannel as any).branchId ??
                    branchIds.join(", "),
                  "Branch IDs",
                )
              }
            />
            <CredentialField
              label="Channel Client ID"
              value={detailClientId}
              placeholder="Rotate to issue a client ID"
              tooltip="Channel Client ID used by your storefront to authenticate with Zenvix."
              helperText="Paste into storefront 'Client ID'."
              copyable={Boolean(detailClientId)}
              onCopy={() => copyCredential(detailClientId, "Channel Client ID")}
            />
            <CredentialField
              label="Storefront API Key"
              value={detailClientSecret}
              placeholder="Rotate to generate a new API key"
              tooltip="API Key used by your storefront to authenticate with Zenvix."
              helperText="Paste into storefront 'Client Secret'."
              copyable={Boolean(detailClientSecret)}
              onCopy={() =>
                copyCredential(detailClientSecret, "Storefront API Key")
              }
            />
            <CredentialField
              label="Gateway URL"
              value={selectedChannel.gatewayUrl ?? gatewayUrl}
              tooltip="Gateway URL this is the endpoint your storefront posts events to."
              helperText="Public endpoint."
              copyable
              onCopy={() =>
                copyCredential(
                  selectedChannel.gatewayUrl ?? gatewayUrl,
                  "Gateway URL",
                )
              }
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Channel Nexus Control
              </div>
              <Badge
                variant="outline"
                className="text-[9px] font-bold uppercase tracking-widest"
              >
                {session.role === Roles.SUPERADMIN
                  ? "SUPERADMIN BYPASS"
                  : approvalStatus === "APPROVED"
                    ? "APPROVED"
                    : approvalStatus === "PENDING"
                      ? "PENDING"
                      : "LOCKED"}
              </Badge>
            </div>

            <Tabs defaultValue="identity" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger
                  value="identity"
                  className="text-[10px] font-black uppercase"
                >
                  Identity
                </TabsTrigger>
                <TabsTrigger
                  value="sync"
                  className="text-[10px] font-black uppercase"
                >
                  Sync Rules
                </TabsTrigger>
                <TabsTrigger
                  value="catalog"
                  className="text-[10px] font-black uppercase"
                >
                  Catalog
                </TabsTrigger>
              </TabsList>

              <TabsContent value="identity" className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">
                      Channel Name
                    </Label>
                    <Input
                      value={detailName}
                      onChange={(e) => setDetailName(e.target.value)}
                      className="h-12 rounded-xl font-bold"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-400">
                      Sync Frequency
                    </Label>
                    <Select
                      value={detailSyncFreq}
                      onValueChange={setDetailSyncFreq}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-12 rounded-xl font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5min">5 Minutes</SelectItem>
                        <SelectItem value="15min">15 Minutes</SelectItem>
                        <SelectItem value="1h">1 Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sync" className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-sm font-black italic">
                      Auto-Sync Inventory
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      Push stock changes immediately
                    </div>
                  </div>
                  <Switch
                    checked={detailSettings?.autoSyncStock || false}
                    onCheckedChange={(val) =>
                      setDetailSettings({
                        ...detailSettings,
                        autoSyncStock: val,
                      })
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-sm font-black italic">
                      Overwrite Prices
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                      Allow channel-specific pricing levels
                    </div>
                  </div>
                  <Switch
                    checked={detailSettings?.overwritePrices || false}
                    onCheckedChange={(val) =>
                      setDetailSettings({
                        ...detailSettings,
                        overwritePrices: val,
                      })
                    }
                    disabled={!canEdit}
                  />
                </div>
              </TabsContent>

              <TabsContent value="catalog" className="space-y-4">
                <Label className="text-xs font-black uppercase text-slate-400 block">
                  Category Filter
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Apparel",
                    "Footwear",
                    "Accessories",
                    "Electronics",
                    "Home & Garden",
                    "Beauty",
                  ].map((cat) => {
                    const isSelected =
                      detailSettings?.visibleCategories?.includes(cat) ?? false;
                    return (
                      <div
                        key={cat}
                        onClick={() => {
                          if (!canEdit) return;
                          const current =
                            detailSettings?.visibleCategories || [];
                          const updated = isSelected
                            ? current.filter((c: string) => c !== cat)
                            : [...current, cat];
                          setDetailSettings({
                            ...detailSettings,
                            visibleCategories: updated,
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${!canEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${isSelected ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                      >
                        {cat}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            {!canEdit && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3">
                <div className="flex items-start gap-2 text-amber-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <div>
                    <div className="font-bold">
                      Approval required to edit this connector.
                    </div>
                    <div className="text-[11px] text-amber-700/80">
                      {approvalStatus === "PENDING"
                        ? `Approval request ${approvalRequestId ?? ""} is pending.`
                        : "Request IT approval to unlock edits."}
                    </div>
                  </div>
                </div>
                {approvalStatus !== "PENDING" && (
                  <Button
                    size="sm"
                    className="self-start bg-amber-600 hover:bg-amber-500 text-white font-bold"
                    onClick={handleRequestApproval}
                  >
                    Request Approval
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-12 rounded-xl border-slate-200 font-bold gap-2"
              onClick={() =>
                handleRotateChannel(selectedChannel.id, { showDialog: false })
              }
              disabled={!canEdit || rotationLoading === selectedChannel.id}
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  rotationLoading === selectedChannel.id ? "animate-spin" : ""
                }`}
              />
              Rotate Client Secret
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl border-slate-200 font-bold text-red-600 hover:text-red-600"
              onClick={() => handleRevokeChannel(selectedChannel.id)}
              disabled={!canEdit || revocationLoading === selectedChannel.id}
            >
              <ShieldOff className="w-4 h-4" />
              Disable Secret
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-xl border-red-200 font-bold text-red-600 hover:text-red-600"
              onClick={() => handleDelete(selectedChannel.id)}
              disabled={!canEdit}
            >
              <AlertCircle className="w-4 h-4" />
              Delete Channel
            </Button>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              onClick={handleSaveChannel}
              disabled={!canEdit || isSaving}
              className="h-12 rounded-xl bg-slate-900 text-white font-bold"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 rounded-xl font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
