import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Link2,
  Plus,
  RefreshCw,
  Server,
  Code2,
  Network,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { workflowService } from "@/core/services/hr/workflowService";
import { resolveDepartment } from "@/core/org/departmentResolver";
import {
  ecommerceHubService,
  type EcommerceConnectorRecord,
  type ChannelRecord,
} from "@/core/services/retail/ecommerceHubService";
import type { WorkflowStatus } from "@/core/tools/workflows/workflowTypes";
import type { RetailChannel } from "@/core/types/retail/retail";
import DeveloperConsole from "@/pages/retail/management/DeveloperConsole";
import { apiUrl } from "@/lib/api-config";

// Modular Components
import { MarketplaceGallery } from "./components/MarketplaceGallery";
import { ChannelListItem } from "./components/ChannelListItem";
import { ManageConnectorDialog } from "./components/ManageConnectorDialog";
import { ChannelDetailDialog } from "./components/ChannelDetailDialog";
import { Card, CardContent } from "@/components/ui/card";

import { useRetail } from "../context/RetailContext";

const EcommerceConnector = () => {
  const session = useSession();
  const { activeStore, activeChannel } = useRetail();
  const { toast } = useToast();

  const branchIds = activeStore
    ? [activeStore.id]
    : activeChannel
      ? [activeChannel.id]
      : [];

  const gatewayUrl = apiUrl("/retail/events");

  const copyCredential = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast({
      title: `${label} Copied`,
      description: `${label} is ready to paste into your storefront configuration.`,
    });
  };

  // State
  const [connectors, setConnectors] = useState<EcommerceConnectorRecord[]>([]);
  const [channels, setChannels] = useState<ChannelRecord[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rotationLoading, setRotationLoading] = useState<string | null>(null);
  const [revocationLoading, setRevocationLoading] = useState<string | null>(
    null,
  );
  const [selectedChannel, setSelectedChannel] = useState<ChannelRecord | null>(
    null,
  );
  const [approvalStatus, setApprovalStatus] = useState<WorkflowStatus | "NONE">(
    "NONE",
  );
  const [approvalRequestId, setApprovalRequestId] = useState<string | null>(
    null,
  );

  // Form State
  const [channelType, setChannelType] = useState<string>("MARKETPLACE");
  const [platform, setPlatform] = useState("custom");
  const [channelName, setChannelName] = useState("");
  const [syncFreq, setSyncFreq] = useState("15min");
  const [detailName, setDetailName] = useState("");
  const [detailSyncFreq, setDetailSyncFreq] = useState("15min");
  const [detailSettings, setDetailSettings] = useState<{
    visibleCategories: string[];
    [key: string]: string | string[] | boolean | number | undefined;
  }>({
    visibleCategories: [],
  });

  // Credentials State
  const [marketplaceApiKey, setMarketplaceApiKey] = useState("");
  const [marketplaceApiSecret, setMarketplaceApiSecret] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{
    connectorId: string;
    apiKey: string;
    channelId: string;
    clientId: string;
    clientSecret: string;
  } | null>(null);

  const [channelSecrets, setChannelSecrets] = useState<
    Record<string, { clientId: string; clientSecret: string }>
  >({});
  const [detailClientSecret, setDetailClientSecret] = useState("");
  const [detailClientId, setDetailClientId] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState("headless");

  // Fetch Data
  const refreshChannels = useCallback(async () => {
    try {
      const data = await ecommerceHubService.listChannels(session);
      const nextChannels = Array.isArray(data) ? data : [];
      setChannels(nextChannels);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
    }
  }, [session, toast]);

  const refreshConnectors = useCallback(async () => {
    try {
      const data = await ecommerceHubService.listConnectors(session);
      setConnectors(data);
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Failed to load connectors",
        variant: "destructive",
      });
    }
  }, [session, toast]);

  useEffect(() => {
    refreshChannels();
    refreshConnectors();
  }, [refreshChannels, refreshConnectors]);

  // Actions
  const handleOpenDialog = (
    preselectName?: string,
    type: string = "MARKETPLACE",
    platformVal: string = "custom",
  ) => {
    setChannelName(preselectName || "");
    setChannelType(type);
    setPlatform(platformVal);
    setMarketplaceApiKey("");
    setMarketplaceApiSecret("");
    setGeneratedCreds(null);
    setIsDialogOpen(true);
  };

  const getChannelApprovalSnapshot = useCallback(
    (channelId: string) => {
      if (session.role === Roles.SUPERADMIN) {
        return { status: "APPROVED" as const, requestId: null };
      }
      const flows = workflowService.listRequests(session.tenantId, {
        entityType: "RETAIL_CHANNEL",
      });
      const matches = flows.filter((flow) => flow.entityId === channelId);
      if (!matches.length) {
        return { status: "NONE" as const, requestId: null };
      }
      const latest = matches.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
      return { status: latest.status, requestId: latest.id };
    },
    [session],
  );

  const loadApprovalStatus = useCallback(
    (channelId: string) => {
      const snapshot = getChannelApprovalSnapshot(channelId);
      setApprovalStatus(snapshot.status);
      setApprovalRequestId(snapshot.requestId);
    },
    [getChannelApprovalSnapshot],
  );

  const handleOpenDetail = (channel: ChannelRecord) => {
    setSelectedChannel(channel);
    setDetailName(channel.name);
    setDetailSyncFreq(channel.syncFrequency || "15m");
    setDetailSettings(
      (channel.settings as {
        visibleCategories: string[];
        [key: string]: string | string[] | boolean | number | undefined;
      }) || { visibleCategories: [] },
    );

    // Fallback to credentials JSON if cached secret not found
    const cachedSecret = channelSecrets[channel.id];
    const credentials = (channel.credentials as Record<string, string>) || {};

    setDetailClientId(
      cachedSecret?.clientId ?? credentials.clientId ?? channel.clientId ?? "",
    );
    setDetailClientSecret(
      cachedSecret?.clientSecret ??
        credentials.clientSecret ??
        channel.clientSecret ??
        "",
    );

    setIsDetailOpen(true);
    loadApprovalStatus(channel.id);
  };

  const handleCreateChannel = async () => {
    if (!channelName) {
      toast({
        title: "Missing Channel Name",
        description: "Please enter a channel name before generating keys.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);
    try {
      if (channelType === "OWNED") {
        // Step 1: Create or Get Connector for this Storefront (Gateway Auth)
        const connectorResult = await ecommerceHubService.createConnector(
          session,
          {
            name: channelName,
            platform: platform,
            domain: `${channelName.toLowerCase().replace(/\s+/g, "-")}.zenvix.io`,
            branchIds,
          },
        );

        // Step 2: Create the Channel under this connector (Channel Auth)
        const channelResult = await ecommerceHubService.createChannel(session, {
          name: channelName,
          type: "OWNED",
          adapterType: platform.toUpperCase() as RetailChannel["type"],
          integrationCategory: platform === "custom" ? "HEADLESS" : "PREMADE",
          syncFrequency: syncFreq,
          settings: {
            connectorId: connectorResult.connector.id,
          },
        });

        // Store generated results for success view
        setGeneratedCreds({
          connectorId: connectorResult.connector.id,
          apiKey: connectorResult.plainApiKey, // Distinct Gateway Key
          channelId: channelResult.channel.id,
          clientId: channelResult.plainClientId, // Distinct Storefront ID
          clientSecret: channelResult.plainClientSecret, // Distinct Storefront Secret
        });

        await refreshChannels();
        await refreshConnectors();
        toast({
          title: "Storefront Generated",
          description: "Credentials issued successfully.",
        });
        return;
      }

      // Marketplace Flow
      await ecommerceHubService.createChannel(session, {
        name: channelName,
        type: "MARKETPLACE",
        adapterType: platform.toUpperCase() as RetailChannel["type"],
        integrationCategory: "PRESET",
        syncFrequency: syncFreq,
        settings: {
          apiKey: marketplaceApiKey,
          apiSecret: marketplaceApiSecret,
        },
      });

      await refreshChannels();
      await refreshConnectors();
      toast({
        title: "Connection Successful",
        description: `Linked to ${channelName} successfully.`,
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm("Disconnect this channel? Integration will stop immediately.")
    ) {
      return;
    }
    try {
      await ecommerceHubService.deleteChannel(session, id);
      await refreshChannels();
      if (selectedChannel?.id === id) {
        setIsDetailOpen(false);
        setSelectedChannel(null);
      }
      toast({ title: "Disconnected", description: "Channel removed." });
    } catch (error) {
      console.error(error);
      toast({
        title: "Delete Failed",
        description: "Could not remove this channel.",
        variant: "destructive",
      });
    }
  };

  const handleRotateChannel = async (
    channelId: string,
    options: { showDialog?: boolean } = {},
  ) => {
    const approvalSnapshot = getChannelApprovalSnapshot(channelId);
    if (
      session.role !== Roles.SUPERADMIN &&
      approvalSnapshot.status !== "APPROVED"
    ) {
      toast({
        title: "Approval Required",
        description: "Request approval to rotate this channel secret.",
        variant: "destructive",
      });
      return;
    }
    setRotationLoading(channelId);
    try {
      const creds = await ecommerceHubService.rotateChannelCredentials(
        session,
        channelId,
      );

      setChannelSecrets((prev) => ({
        ...prev,
        [channelId]: {
          clientId: creds.plainClientId,
          clientSecret: creds.plainClientSecret,
        },
      }));

      if (selectedChannel?.id === channelId) {
        setDetailClientId(creds.plainClientId);
        setDetailClientSecret(creds.plainClientSecret);
      }

      toast({
        title: "Credentials Rotated",
        description: "New client secret created and updated in state.",
      });
      await refreshChannels();
    } catch (error) {
      console.error(error);
      toast({
        title: "Rotation Failed",
        description: "Could not rotate credentials.",
        variant: "destructive",
      });
    } finally {
      setRotationLoading(null);
    }
  };

  const handleRevokeChannel = async (channelId: string) => {
    const approvalSnapshot = getChannelApprovalSnapshot(channelId);
    if (
      session.role !== Roles.SUPERADMIN &&
      approvalSnapshot.status !== "APPROVED"
    ) {
      toast({
        title: "Approval Required",
        description: "Request approval to revoke this channel secret.",
        variant: "destructive",
      });
      return;
    }
    if (
      !confirm(
        "Revoke these credentials? External storefronts will immediately lose access.",
      )
    ) {
      return;
    }
    setRevocationLoading(channelId);
    try {
      await ecommerceHubService.revokeChannelCredentials(session, channelId);
      toast({
        title: "Credentials Revoked",
        description: "Channel access is now disabled.",
      });
      setChannelSecrets((prev) => {
        const next = { ...prev };
        delete next[channelId];
        return next;
      });
      if (selectedChannel?.id === channelId) {
        setDetailClientSecret("");
      }
      await refreshChannels();
    } catch (error) {
      console.error(error);
      toast({
        title: "Revoke Failed",
        description: "Failed to revoke credentials.",
        variant: "destructive",
      });
    } finally {
      setRevocationLoading(null);
    }
  };

  const handleRequestApproval = () => {
    if (!selectedChannel) return;
    const makerDept =
      resolveDepartment(session.departmentId)?.code ?? session.departmentId;
    const request = workflowService.createRequest(session.tenantId, session, {
      entityType: "RETAIL_CHANNEL",
      entityId: selectedChannel.id,
      makerDept,
      destinationDept: "IT",
      notes: `Channel edit request for ${selectedChannel.name}`,
    });
    setApprovalStatus(request.status);
    setApprovalRequestId(request.id);
    toast({
      title: "Approval Requested",
      description: "Your request has been routed to IT for review.",
    });
  };

  const handleSaveChannel = async () => {
    if (!selectedChannel) return;
    if (!detailName.trim()) {
      toast({
        title: "Missing Name",
        description: "Channel name is required.",
        variant: "destructive",
      });
      return;
    }
    const canEdit =
      session.role === Roles.SUPERADMIN || approvalStatus === "APPROVED";
    if (!canEdit) {
      toast({
        title: "Approval Required",
        description: "Request IT approval to save changes.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const updated = await ecommerceHubService.updateChannel(
        session,
        selectedChannel.id,
        {
          name: detailName.trim(),
          syncFrequency: detailSyncFreq,
          settings: detailSettings,
        },
      );
      setChannels((prev) =>
        prev.map((channel) => (channel.id === updated.id ? updated : channel)),
      );
      setSelectedChannel(updated as ChannelRecord);
      toast({ title: "Updated", description: "Settings saved successfully." });
    } catch (error) {
      console.error(error);
      toast({
        title: "Update Failed",
        description: "Could not update channel.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const availableMarketplaces = [
    { id: "tokopedia", name: "Tokopedia", color: "emerald", icon: ShoppingBag },
    { id: "shopee", name: "Shopee", color: "orange", icon: ShoppingBag },
    { id: "lazada", name: "Lazada", color: "blue", icon: ShoppingBag },
    { id: "tiktok", name: "TikTok Shop", color: "slate", icon: ShoppingBag },
  ];

  const canEdit =
    session.role === Roles.SUPERADMIN || approvalStatus === "APPROVED";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <PageHeader
        title="Ecommerce Hub"
        subtitle="Unified control center for headless storefronts and marketplace integrations."
        primaryAction={
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={refreshChannels}
              className="h-11 rounded-xl px-4 font-bold border-slate-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Data
            </Button>
            <Button
              className="h-11 rounded-xl px-6 bg-slate-900 text-white font-bold shadow-lg"
              onClick={() => handleOpenDialog("", "OWNED", "custom")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Provision New Store
            </Button>
          </div>
        }
      />

      <WorkspacePanel>
        <div className="p-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-8"
          >
            <div className="flex items-center justify-between border-b border-slate-200">
              <TabsList className="bg-transparent h-auto p-0 gap-8">
                <TabsTrigger
                  value="headless"
                  className="bg-transparent h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent px-0 font-black italic uppercase tracking-widest text-xs"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  Headless
                </TabsTrigger>
                <TabsTrigger
                  value="premade"
                  className="bg-transparent h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent px-0 font-black italic uppercase tracking-widest text-xs"
                >
                  <Network className="w-4 h-4 mr-2" />
                  Premade
                </TabsTrigger>
                <TabsTrigger
                  value="preset"
                  className="bg-transparent h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent px-0 font-black italic uppercase tracking-widest text-xs"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Preset
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="headless">
              <div className="space-y-8">
                {/* Flow Explanation */}
                <div className="bg-blue-50 border border-blue-200 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Code2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-blue-900 mb-2">
                      Headless Strategy: Provisioning Flow
                    </h2>
                    <p className="text-sm text-blue-700 font-medium leading-relaxed">
                      To integrate a custom storefront, first click{" "}
                      <span
                        className="font-black italic underline cursor-pointer"
                        onClick={() => handleOpenDialog("", "OWNED", "custom")}
                      >
                        PROVISION NEW STORE
                      </span>
                      . You will receive <strong>Gateway Credentials</strong>{" "}
                      (for API access) and <strong>Storefront Secrets</strong>{" "}
                      (for Auth). Copy these into your `.env` and use the{" "}
                      <strong>Developer Console</strong> below to verify
                      connectivity immediately.
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Gateway Kit Card */}
                  <Card className="col-span-1 rounded-[2rem] border-slate-900 bg-slate-900 p-8 text-white shadow-2xl">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                      <Server className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-black italic uppercase italic tracking-tighter mb-2">
                      Gateway Kit
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mb-6 uppercase tracking-widest">
                      Global Endpoint Configuration
                    </p>
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="text-[10px] font-black uppercase text-slate-500 mb-1">
                          Gateway URL
                        </div>
                        <div className="text-[11px] font-mono break-all text-emerald-400">
                          {gatewayUrl}
                        </div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="text-[10px] font-black uppercase text-slate-500 mb-1">
                          Region
                        </div>
                        <div className="text-xs font-bold text-white">
                          ID-JKT-01 (Primary)
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Dev Console Embed */}
                  <div className="col-span-2">
                    <DeveloperConsole />
                  </div>
                </div>

                {/* Filtered Channels */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-400">
                    Headless Deployments
                  </h3>
                  <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {channels.filter(
                        (c) => c.integrationCategory === "HEADLESS",
                      ).length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs font-bold italic uppercase">
                          No active headless deployments
                        </div>
                      ) : (
                        channels
                          .filter((c) => c.integrationCategory === "HEADLESS")
                          .map((channel) => (
                            <ChannelListItem
                              key={channel.id}
                              channel={channel}
                              session={session}
                              branchIds={branchIds}
                              gatewayUrl={gatewayUrl}
                              channelSecrets={channelSecrets}
                              onOpenDetail={handleOpenDetail}
                              copyCredential={copyCredential}
                            />
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="premade">
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <Card className="rounded-[2.5rem] border-slate-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all group border-2">
                    <CardContent className="p-10 space-y-6">
                      <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mb-6 group-hover:rotate-12 transition-transform">
                        <Network className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
                          Webhook Bridge
                        </div>
                        <p className="text-slate-500 font-medium leading-relaxed mt-4">
                          Connect your bespoke CMS or ERP via simple outbound
                          webhooks and JSON mapping.
                        </p>
                      </div>
                      <Button
                        className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-black italic uppercase tracking-widest text-xs shadow-2xl mt-4"
                        onClick={() =>
                          handleOpenDialog("Custom Webhook", "OWNED", "CUSTOM")
                        }
                      >
                        Setup Bridge
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[2.5rem] border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col justify-center p-12 text-center items-center">
                    <div className="w-16 h-16 bg-white rounded-3xl border-2 border-slate-200 flex items-center justify-center border-dashed mb-4">
                      <Plus className="w-8 h-8 text-slate-300" />
                    </div>
                    <div className="font-black italic uppercase tracking-widest text-xs text-slate-500">
                      Template Repository
                    </div>
                    <p className="text-xs text-slate-400 font-bold mt-2 max-w-[200px]">
                      Import pre-defined JSON schemas for major ERP systems.
                    </p>
                  </Card>
                </div>

                {/* Filtered Channels */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-400">
                    Active Bridges
                  </h3>
                  <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {channels.filter(
                        (c) => c.integrationCategory === "PREMADE",
                      ).length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs font-bold italic uppercase">
                          No active webhook bridges
                        </div>
                      ) : (
                        channels
                          .filter((c) => c.integrationCategory === "PREMADE")
                          .map((channel) => (
                            <ChannelListItem
                              key={channel.id}
                              channel={channel}
                              session={session}
                              branchIds={branchIds}
                              gatewayUrl={gatewayUrl}
                              channelSecrets={channelSecrets}
                              onOpenDetail={handleOpenDetail}
                              copyCredential={copyCredential}
                            />
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preset">
              <div className="space-y-8">
                <MarketplaceGallery
                  marketplaces={availableMarketplaces}
                  onSelect={(name, type, platform) =>
                    handleOpenDialog(name, type, platform)
                  }
                />

                {/* Filtered Channels */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black italic uppercase tracking-widest text-slate-400">
                    Marketplace Syncs
                  </h3>
                  <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {channels.filter(
                        (c) => c.integrationCategory === "PRESET",
                      ).length === 0 ? (
                        <div className="p-12 text-center text-slate-400 text-xs font-bold italic uppercase">
                          No active marketplace syncs
                        </div>
                      ) : (
                        channels
                          .filter((c) => c.integrationCategory === "PRESET")
                          .map((channel) => (
                            <ChannelListItem
                              key={channel.id}
                              channel={channel}
                              session={session}
                              branchIds={branchIds}
                              gatewayUrl={gatewayUrl}
                              channelSecrets={channelSecrets}
                              onOpenDetail={handleOpenDetail}
                              copyCredential={copyCredential}
                            />
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </WorkspacePanel>

      {/* Dialogs */}
      <ManageConnectorDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        channelType={channelType}
        channelName={channelName}
        setChannelName={setChannelName}
        syncFreq={syncFreq}
        setSyncFreq={setSyncFreq}
        marketplaceApiKey={marketplaceApiKey}
        setMarketplaceApiKey={setMarketplaceApiKey}
        marketplaceApiSecret={marketplaceApiSecret}
        setMarketplaceApiSecret={setMarketplaceApiSecret}
        isProcessing={isProcessing}
        handleCreateChannel={handleCreateChannel}
        generatedCreds={generatedCreds}
        session={session}
        branchIds={branchIds}
        gatewayUrl={gatewayUrl}
        copyCredential={copyCredential}
      />

      <ChannelDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        selectedChannel={selectedChannel}
        detailName={detailName}
        setDetailName={setDetailName}
        detailSyncFreq={detailSyncFreq}
        setDetailSyncFreq={setDetailSyncFreq}
        detailSettings={detailSettings}
        setDetailSettings={setDetailSettings}
        detailClientId={detailClientId}
        detailClientSecret={detailClientSecret}
        approvalStatus={approvalStatus}
        approvalRequestId={approvalRequestId}
        canEdit={canEdit}
        isSaving={isSaving}
        rotationLoading={rotationLoading}
        revocationLoading={revocationLoading}
        session={session}
        branchIds={branchIds}
        gatewayUrl={gatewayUrl}
        handleRotateChannel={handleRotateChannel}
        handleRevokeChannel={handleRevokeChannel}
        handleDelete={handleDelete}
        handleSaveChannel={handleSaveChannel}
        handleRequestApproval={handleRequestApproval}
        copyCredential={copyCredential}
      />
    </div>
  );
};

export default EcommerceConnector;
