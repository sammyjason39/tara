import React from "react";
import { CopyPill } from "./SharedUI";
import { Badge } from "@/components/ui/badge";
import { Globe, ShoppingBag, Link2 } from "lucide-react";
import type { ChannelRecord } from "@/core/services/retail/ecommerceHubService";

interface ChannelListItemProps {
  channel: ChannelRecord;
  session: any;
  branchIds: string[];
  gatewayUrl: string;
  channelSecrets: Record<string, { clientId: string; clientSecret: string }>;
  onOpenDetail: (channel: ChannelRecord) => void;
  copyCredential: (value: string, label: string) => void;
}

export const ChannelListItem = ({
  channel,
  session,
  branchIds,
  gatewayUrl,
  channelSecrets,
  onOpenDetail,
  copyCredential,
}: ChannelListItemProps) => {
  const resolveChannelClientId = (ch: ChannelRecord) =>
    ch.clientId ?? (ch.credentials as any)?.clientId ?? ch.channelId ?? "";
  
  const resolveChannelSecret = (ch: ChannelRecord) =>
    channelSecrets[ch.id]?.clientSecret ??
    (ch.credentials as any)?.clientSecret ??
    ch.clientSecret ??
    "";
  
  const resolveChannelConnector = (ch: ChannelRecord) =>
    ch.connector ?? ch.name ?? "";
  
  const resolveChannelTenantId = (ch: ChannelRecord) =>
    ch.tenantId ?? ch.tenantId ?? session.tenantId;
  
  const resolveChannelBranchId = (ch: any) =>
    ch.branchIds?.[0] ?? ch.branchId ?? (ch.credentials as any)?.branchId ?? branchIds[0];
  
  const resolveChannelGatewayUrl = (ch: ChannelRecord) =>
    ch.gatewayUrl ?? (ch.credentials as any)?.gatewayUrl ?? gatewayUrl;

  const clientId = resolveChannelClientId(channel);
  const secret = resolveChannelSecret(channel);
  const connector = resolveChannelConnector(channel);
  const tenantId = resolveChannelTenantId(channel);
  const branch = resolveChannelBranchId(channel);
  const gateway = resolveChannelGatewayUrl(channel);

  return (
    <div key={channel.id} className="border-t border-slate-100">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenDetail(channel)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetail(channel);
          }
        }}
        className="grid grid-cols-[2fr_1fr_1fr_1fr_1.6fr] gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      >
        <div>
          <div className="text-sm font-semibold text-slate-900">{channel.name}</div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
              {channel.type}
            </Badge>
            <span>
              Channel ID (Record):{" "}
              <span className="font-bold text-slate-900">{channel.id}</span>
            </span>
          </div>
        </div>
        <div className="text-sm font-bold text-slate-900">{tenantId}</div>
        <div className="text-sm font-bold text-slate-900">{branch}</div>
        <div>
          <Badge
            className={`text-[9px] font-black uppercase tracking-widest ${
              channel.status === "active"
                ? "bg-emerald-100 text-emerald-700 border-none"
                : "bg-slate-100 text-slate-500 border-none"
            }`}
          >
            {channel.status}
          </Badge>
        </div>
        <div className="text-xs font-mono font-bold text-slate-700 truncate">
          {clientId || "Not issued"}
        </div>
      </div>
      <div className="px-6 pb-4">
        <div className="flex flex-wrap gap-2">
          <CopyPill
            label="Gateway URL"
            value={gateway}
            onClick={(e) => {
              e.stopPropagation();
              copyCredential(gateway, "Gateway URL");
            }}
          />
          <CopyPill
            label="Storefront Client ID"
            value={clientId}
            onClick={(e) => {
              e.stopPropagation();
              copyCredential(clientId, "Storefront Client ID");
            }}
          />
          <CopyPill
            label="Storefront Client Secret"
            value={secret}
            onClick={(e) => {
              e.stopPropagation();
              copyCredential(secret, "Storefront Client Secret");
            }}
          />
          <CopyPill
            label="Tenant ID"
            value={tenantId}
            onClick={(e) => {
              e.stopPropagation();
              copyCredential(tenantId, "Tenant ID");
            }}
          />
          <CopyPill
            label="Branch ID"
            value={branch}
            onClick={(e) => {
              e.stopPropagation();
              copyCredential(branch, "Branch ID");
            }}
          />
          <CopyPill
            label="Connector"
            value={connector}
            onClick={(e) => {
              e.stopPropagation();
              copyCredential(connector, "Connector");
            }}
          />
        </div>
      </div>
    </div>
  );
};
