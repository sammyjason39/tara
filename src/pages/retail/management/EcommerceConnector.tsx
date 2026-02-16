import React, { useState, useEffect } from "react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import {
  Globe,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Settings,
  Zap,
  Link2,
  AlertCircle,
  Plus,
  RefreshCw,
  Copy,
  Server,
  ShieldCheck,
  Code2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/core/security/session";
import { Separator } from "@/components/ui/separator";
import { retailService } from "@/core/services/retail/retailService";
import type { RetailChannel, ChannelType } from "@/core/types/retail/retail";
import { nextId } from "@/core/repositories/hr/storage";
import DeveloperConsole from "@/pages/retail/management/DeveloperConsole";

const EcommerceConnector = () => {
  const session = useSession();
  const { toast } = useToast();
  
  // State
  const [channels, setChannels] = useState<RetailChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [channelType, setChannelType] = useState<ChannelType>("MARKETPLACE");
  const [channelName, setChannelName] = useState("");
  const [syncFreq, setSyncFreq] = useState("15m");
  
  // Credentials State (Marketplace Input or Owned Output)
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [generatedCreds, setGeneratedCreds] = useState<{clientId: string, clientSecret: string} | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState("channels");

  // Fetch Data
  const refreshChannels = () => {
    try {
      const data = retailService.listChannels(session.tenantId);
      setChannels(data);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load channels", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshChannels();
  }, [session.tenantId]);

  // Actions
  const handleOpenDialog = (preselectName?: string, type: ChannelType = "MARKETPLACE") => {
    setChannelName(preselectName || "");
    setChannelType(type);
    setApiKey("");
    setApiSecret("");
    setGeneratedCreds(null);
    setIsDialogOpen(true);
  };
 
  // ... (keep handleCreateChannel)
   const handleCreateChannel = () => {
    if (!channelName) return;
    setIsProcessing(true);

    try {
      // 1. Simulate Delay
      setTimeout(() => {
        const newChannel: RetailChannel = {
          id: nextId("ch"),
          tenantId: session.tenantId,
          name: channelName,
          type: channelType,
          status: "active",
          syncFrequency: syncFreq,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // Store Credentials for Demo Purpose (In real app, hash this!)
          // We need to suppress TS error for now or add field to type.
          // For now, we will just rely on the user copying them.
          // The Gateway Simulation uses a "StartsWith" check, so we don't strictly need to store them here
          // to make the demo work, as long as the user uses the generated keys.
        };

        // 2. Logic based on Type
        if (channelType === "OWNED") {
           // Generate Credentials for the user
           const clientId = `znx_${Math.random().toString(36).substring(2, 10)}`;
           const clientSecret = `sk_live_${Math.random().toString(36).substring(2, 20)}`;
           setGeneratedCreds({ clientId, clientSecret });
           
           // Persist
           retailService.createChannel(session.tenantId, session, newChannel);
           refreshChannels();
           toast({ title: "Storefront Created", description: "Headless credentials generated successfully." });
           setIsProcessing(false);
           // Don't close dialog yet, user needs to copy creds
        } else {
           // Marketplace Logic (Mock Verify)
           if (!apiKey || !apiSecret) {
             toast({ title: "Error", description: "API Key and Secret required for Marketplace", variant: "destructive" });
             setIsProcessing(false);
             return; 
           }
           
           retailService.createChannel(session.tenantId, session, newChannel);
           refreshChannels();
           toast({ title: "Connection Successful", description: `Linked to ${channelName} successfully.` });
           setIsProcessing(false);
           setIsDialogOpen(false);
        }
      }, 1500);

    } catch (e) {
      setIsProcessing(false);
      toast({ title: "Error", description: "Failed to create channel", variant: "destructive" });
    }
  };
  const handleDelete = (id: string) => {
    if (confirm("Disconnect this channel? Integration will stop immediately.")) {
       retailService.deleteChannel(session.tenantId, session, id);
       refreshChannels();
       toast({ title: "Disconnected", description: "Channel removed." });
    }
  };

  const handleSync = (id: string) => {
    retailService.syncChannel(session.tenantId, session, id);
    refreshChannels();
    toast({ title: "Sync Triggered", description: "Data synchronization started in background." });
  };

  // Helper Configs
  const availableMarketplaces = [
    { id: "tokopedia", name: "Tokopedia", color: "emerald", icon: ShoppingBag },
    { id: "shopee", name: "Shopee", color: "orange", icon: ShoppingBag },
    { id: "lazada", name: "Lazada", color: "blue", icon: ShoppingBag },
    { id: "tiktok", name: "TikTok Shop", color: "slate", icon: ShoppingBag },
  ];

  const getIcon = (type: ChannelType) => {
     switch(type) {
       case 'OWNED': return Globe;
       case 'MARKETPLACE': return ShoppingBag;
       default: return Link2;
     }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commerce Authority Hub"
        subtitle="Unified control plane for Marketplaces, Headless Storefronts, and POS integrations."
      />

      <WorkspacePanel>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
           <div className="flex justify-between items-center">
              <TabsList className="bg-slate-100 p-1 rounded-xl">
                 <TabsTrigger value="channels" className="rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm transition-all">
                    Active Channels
                 </TabsTrigger>
                 <TabsTrigger value="developer" className="rounded-lg text-xs font-bold uppercase tracking-widest px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">
                    Developer Console
                 </TabsTrigger>
              </TabsList>
           </div>

           <TabsContent value="channels">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <Card className="bg-slate-900 text-white border-0 shadow-xl">
                    <CardContent className="p-6">
                       <div className="flex items-center gap-3 mb-2">
                          <Server className="w-5 h-5 text-blue-400" />
                          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Total Channels</div>
                       </div>
                       <div className="text-3xl font-black italic tracking-tighter">{channels.length}</div>
                       <div className="text-[10px] text-slate-400 mt-2 font-bold uppercase">
                          {channels.filter(c => c.status === 'active').length} Active • {channels.filter(c => c.type === 'OWNED').length} Owned
                       </div>
                    </CardContent>
                 </Card>
                 
                 <Card className="border-slate-200 border-l-4 border-l-emerald-500 shadow-md">
                    <CardContent className="p-6">
                       <div className="flex items-center gap-3 mb-2">
                          <Zap className="w-5 h-5 text-emerald-600" />
                          <div className="text-xs font-black uppercase tracking-widest text-slate-400">Sync Velocity</div>
                       </div>
                       <div className="text-3xl font-black italic tracking-tighter text-slate-900">Real-time</div>
                       <div className="text-[10px] text-emerald-600 mt-2 font-bold uppercase">
                          Websockets Active
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="border-slate-200 border-l-4 border-l-indigo-500 shadow-md">
                    <CardContent className="p-6">
                       <div className="flex items-center gap-3 mb-2">
                          <Code2 className="w-5 h-5 text-indigo-600" />
                          <div className="text-xs font-black uppercase tracking-widest text-slate-400">API Health</div>
                       </div>
                       <div className="text-3xl font-black italic tracking-tighter text-slate-900">100%</div>
                       <div className="text-[10px] text-indigo-600 mt-2 font-bold uppercase">
                          0 Errors / 24h
                       </div>
                    </CardContent>
                 </Card>
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center mb-6">
                 <div className="text-sm font-black italic tracking-widest text-slate-400 uppercase">Active Integrations</div>
                 <Button 
                   onClick={() => handleOpenDialog("", "OWNED")}
                   className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black italic shadow-xl gap-2"
                 >
                   <Plus className="w-5 h-5" />
                   New Headless Storefront
                 </Button>
              </div>

              {/* Channel Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                 {channels.map(channel => {
                   const Icon = getIcon(channel.type);
                   const isOwned = channel.type === 'OWNED';
                   return (
                     <Card key={channel.id} className="group hover:border-blue-400 transition-all cursor-pointer border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl">
                        <CardContent className="p-0">
                           <div className="flex">
                              {/* Status Strip */}
                              <div className={`w-3 ${channel.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              
                              <div className="p-6 flex-1">
                                 <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOwned ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                          <Icon className="w-6 h-6" />
                                       </div>
                                       <div>
                                          <div className="text-lg font-black italic text-slate-900 leading-tight">{channel.name}</div>
                                          <div className="flex items-center gap-2 mt-1">
                                             <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">{channel.type}</Badge>
                                             <span className="text-[10px] text-slate-400 font-bold">ID: {channel.id}</span>
                                          </div>
                                       </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-red-500" onClick={(e) => {e.stopPropagation(); handleDelete(channel.id)}}>
                                       <XCircle className="w-5 h-5" />
                                    </Button>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="text-xs">
                                       <div className="text-slate-400 font-bold uppercase text-[9px]">Last Sync</div>
                                       <div className="font-bold text-slate-700">{new Date(channel.lastSync || Date.now()).toLocaleTimeString()}</div>
                                    </div>
                                    <div className="text-xs">
                                       <div className="text-slate-400 font-bold uppercase text-[9px]">Sync Freq</div>
                                       <div className="font-bold text-slate-700">{channel.syncFrequency}</div>
                                    </div>
                                 </div>

                                 <div className="flex gap-2">
                                    <Button onClick={() => handleSync(channel.id)} variant="outline" size="sm" className="flex-1 rounded-xl text-xs font-bold gap-2 hover:bg-blue-50 hover:text-blue-600 border-slate-200">
                                       <RefreshCw className="w-3 h-3" /> Sync Now
                                    </Button>
                                    <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold border-slate-200">
                                       <Settings className="w-3 h-3" />
                                    </Button>
                                 </div>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                   );
                 })}
              </div>

              {/* Marketplace Gallery */}
              <div className="mb-6">
                 <div className="text-sm font-black italic tracking-widest text-slate-400 uppercase mb-4">Connect Marketplace</div>
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {availableMarketplaces.map(mp => (
                       <Card 
                         key={mp.id} 
                         onClick={() => handleOpenDialog(mp.name, "MARKETPLACE")}
                         className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all group rounded-2xl"
                       >
                          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                             <div className={`w-12 h-12 bg-${mp.color}-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                <mp.icon className={`w-6 h-6 text-${mp.color}-600`} />
                             </div>
                             <div className="font-black italic text-slate-700 text-sm group-hover:text-blue-700">{mp.name}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ready to Connect</div>
                          </CardContent>
                       </Card>
                    ))}
                 </div>
              </div>
           </TabsContent>

           <TabsContent value="developer">
             <DeveloperConsole 
                defaultClientId={generatedCreds?.clientId}
                defaultClientSecret={generatedCreds?.clientSecret}
             />
           </TabsContent>
        </Tabs>

        {/* Main Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogContent className="max-w-xl rounded-[2rem] p-0 overflow-hidden">
              <div className="bg-slate-900 p-8 text-white">
                 <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                    {channelType === 'OWNED' ? <Globe className="w-6 h-6 text-indigo-400" /> : <ShoppingBag className="w-6 h-6 text-emerald-400" />}
                    {channelType === 'OWNED' ? 'Provision Headless Store' : 'Connect Marketplace'}
                 </DialogTitle>
                 <DialogDescription className="text-slate-400 font-medium italic mt-2">
                    {channelType === 'OWNED' 
                       ? "Generate API credentials for your custom Zenvix Storefront." 
                       : "Authorize Zenvix to manage products and orders on this external channel."}
                 </DialogDescription>
              </div>
              
              <div className="p-8 space-y-6">
                 {generatedCreds ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                       <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                          <div>
                             <div className="font-bold text-emerald-800 text-sm">Channel Provisioned Successfully</div>
                             <div className="text-xs text-emerald-600 mt-1">Copy these credentials. They will not be shown again.</div>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="space-y-2">
                             <Label className="text-xs font-black uppercase text-slate-400">Client ID (Public)</Label>
                             <div className="flex gap-2">
                                <code className="flex-1 bg-slate-100 p-3 rounded-lg font-mono text-xs font-bold text-slate-700">{generatedCreds.clientId}</code>
                                <Button variant="outline" size="icon" onClick={() => {navigator.clipboard.writeText(generatedCreds.clientId); toast({title:"Copied"})}}>
                                   <Copy className="w-4 h-4" />
                                </Button>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs font-black uppercase text-slate-400">Client Secret (Private)</Label>
                             <div className="flex gap-2">
                                <code className="flex-1 bg-slate-100 p-3 rounded-lg font-mono text-xs font-bold text-slate-700">{generatedCreds.clientSecret}</code>
                                <Button variant="outline" size="icon" onClick={() => {navigator.clipboard.writeText(generatedCreds.clientSecret); toast({title:"Copied"})}}>
                                   <Copy className="w-4 h-4" />
                                </Button>
                             </div>
                          </div>
                       </div>

                       <DialogFooter>
                          <Button onClick={() => setIsDialogOpen(false)} className="w-full h-12 rounded-xl font-bold bg-slate-900 text-white">
                             Done
                          </Button>
                       </DialogFooter>
                    </div>
                 ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                           <Label className="text-xs font-black uppercase text-slate-400">Channel Name</Label>
                           <Input 
                             value={channelName} 
                             onChange={e => setChannelName(e.target.value)} 
                             className="h-12 rounded-xl font-bold" 
                             placeholder={channelType === 'OWNED' ? "e.g. My Flagship Website" : "e.g. Tokopedia Official"}
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-xs font-black uppercase text-slate-400">Channel Type</Label>
                              <div className="h-12 flex items-center px-4 bg-slate-50 rounded-xl font-bold text-sm text-slate-500 border border-slate-200">
                                 {channelType}
                              </div>
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-black uppercase text-slate-400">Sync Frequency</Label>
                              <Select value={syncFreq} onValueChange={setSyncFreq}>
                                 <SelectTrigger className="h-12 rounded-xl font-bold">
                                    <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="5m">5 Minutes</SelectItem>
                                    <SelectItem value="15m">15 Minutes</SelectItem>
                                    <SelectItem value="1h">1 Hour</SelectItem>
                                 </SelectContent>
                              </Select>
                           </div>
                        </div>

                        {channelType === 'MARKETPLACE' && (
                           <>
                              <Separator className="my-2" />
                              <div className="space-y-4">
                                 <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-xs font-bold">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>Enter your marketplace API credentials below.</span>
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400">API Key / Shop ID</Label>
                                    <Input 
                                      value={apiKey} 
                                      onChange={e => setApiKey(e.target.value)}
                                      className="h-12 rounded-xl font-bold" 
                                      type="password"
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400">API Secret</Label>
                                    <Input 
                                      value={apiSecret} 
                                      onChange={e => setApiSecret(e.target.value)}
                                      className="h-12 rounded-xl font-bold" 
                                      type="password"
                                    />
                                 </div>
                              </div>
                           </>
                        )}
                        
                        <div className="pt-4">
                           <Button 
                             onClick={handleCreateChannel} 
                             disabled={isProcessing || !channelName}
                             className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black italic uppercase tracking-widest shadow-xl"
                           >
                              {isProcessing ? (
                                 <><RefreshCw className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                              ) : (
                                 channelType === 'OWNED' ? 'Generate Storefront Keys' : 'Authenticate & Connect'
                              )}
                           </Button>
                        </div>
                    </div>
                 )}
              </div>
           </DialogContent>
        </Dialog>
      </WorkspacePanel>
    </div>
  );
};

export default EcommerceConnector;
