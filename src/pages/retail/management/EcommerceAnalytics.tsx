import { useState, useEffect } from "react";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
} from "lucide-react";
import { useSession } from "@/core/security/session";
import { retailService } from "@/core/services/retail/retailService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EcommerceAnalytics() {
  const session = useSession();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState("all");

  useEffect(() => {
    fetchAnalytics();
  }, [selectedChannel]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await retailService.getEcommerceAnalytics(
        session.tenant_id,
        session,
        selectedChannel === "all" ? undefined : selectedChannel
      );
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !analytics) return (
    <div className="p-40 text-center space-y-6">
       <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_50px_rgba(79,70,229,0.3)]" />
       <p className="text-sm font-black italic text-muted-foreground uppercase tracking-[0.4em] animate-pulse">
         Synchronizing Global Fleet Metrics...
       </p>
    </div>
  );

  return (
    <div className="space-y-16">
      {/* Analytics Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-4">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-6 text-foreground italic">
            <div className="p-4 rounded-2xl bg-primary text-foreground shadow-2xl shadow-indigo-600/20">
              <Globe className="w-8 h-8" />
            </div>
            Ecommerce Intelligence
          </h2>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em] ml-[88px] italic">
            Real-time telemetry from all connected digital storefronts
          </p>
        </div>
        <Select value={selectedChannel} onValueChange={setSelectedChannel}>
          <SelectTrigger className="w-[320px] h-16 rounded-2xl bg-secondary/40 border-border font-black uppercase italic text-[11px] tracking-[0.3em] text-foreground focus:ring-2 focus:ring-indigo-600/50 shadow-2xl">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl bg-secondary border-border text-foreground shadow-3xl backdrop-blur-3xl">
            <SelectItem value="all" className="font-black uppercase italic text-[10px] tracking-widest focus:bg-primary focus:text-foreground">Global Fleet View</SelectItem>
            <SelectItem value="headless" className="font-black uppercase italic text-[10px] tracking-widest focus:bg-primary focus:text-foreground">Headless API</SelectItem>
            <SelectItem value="shopify" className="font-black uppercase italic text-[10px] tracking-widest focus:bg-primary focus:text-foreground">Shopify Integration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Revenue (Gross)"
          value={`Rp ${(analytics?.revenue || 0).toLocaleString()}`}
          trend="+12.5%"
          isPositive={true}
          icon={DollarSign}
          color="indigo"
        />
        <StatsCard
          title="Order Velocity"
          value={analytics?.orderCount || 0}
          trend="+8.2%"
          isPositive={true}
          icon={ShoppingCart}
          color="violet"
        />
        <StatsCard
          title="Active Sessions"
          value="1,284"
          trend="-2.4%"
          isPositive={false}
          icon={Users}
          color="sky"
        />
        <StatsCard
          title="Conversion Rate"
          value="3.82%"
          trend="+0.5%"
          isPositive={true}
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Secondary Intelligence Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Products */}
        <Card className="lg:col-span-2 rounded-2xl border border-white/5 shadow-2xl bg-white/[0.03] backdrop-blur-3xl overflow-hidden group/products">
          <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter text-foreground italic">
              High-Velocity Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {(analytics?.topProducts || []).map((product: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-6 hover:bg-white/[0.04] transition-all duration-500 group/item relative overflow-hidden cursor-pointer">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/40 border border-border flex items-center justify-center font-black text-primary text-xl italic shadow-2xl group-hover/item:scale-110 transition-transform">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xl font-black italic text-foreground italic tracking-tight">{product.name}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2 italic">SKU: PROD-{idx+100}</p>
                    </div>
                  </div>
                  <div className="text-right relative z-10">
                    <p className="text-2xl font-black italic text-foreground italic tracking-tighter">{product.count} Units</p>
                    <p className="text-[10px] font-black text-success uppercase tracking-[0.3em] mt-2 italic">Demand Peak</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Channel Health */}
        <Card className="rounded-2xl border border-white/5 shadow-2xl bg-secondary overflow-hidden group/health">
          <CardHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter text-foreground italic">
              Channel Latency
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-12">
            <HealthItem label="Headless API" status="Optimal" value="24ms" color="text-primary" dot="bg-primary/40" />
            <HealthItem label="Shopify Webhook" status="Nominal" value="142ms" color="text-success" dot="bg-emerald-400" />
            <HealthItem label="Sync Engine" status="Optimal" value="0.8s" color="text-sky-400" dot="bg-sky-400" />
            
            <div className="pt-12 mt-12 border-t border-border">
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-6 italic">Integrity Status</p>
              <div className="flex items-center gap-4 px-6 py-4 bg-secondary/40 rounded-2xl border border-border shadow-2xl">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black uppercase italic tracking-[0.2em] text-foreground">All Systems Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, trend, isPositive, icon: Icon, color }: any) {
  const colorMap: any = {
    indigo: "text-primary bg-primary/10 border-indigo-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    emerald: "text-success bg-success/10 border-emerald-500/20",
  };

  return (
    <Card className="rounded-[2rem] border border-white/5 shadow-2xl bg-white/[0.03] backdrop-blur-3xl p-6 space-y-8 hover:-translate-y-2 transition-all duration-700 group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/40 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/10 transition-all duration-1000" />
      <div className="flex items-center justify-between relative z-10">
        <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center border shadow-2xl transition-all duration-500 group-hover:scale-110", colorMap[color])}>
          <Icon className="w-8 h-8" />
        </div>
        <Badge className={cn("border-none rounded-xl px-3 h-7 flex gap-2 items-center font-black text-[10px] italic tracking-widest shadow-xl", isPositive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-rose-400')}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trend}
        </Badge>
      </div>
      <div className="space-y-3 relative z-10">
        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">{title}</p>
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-foreground italic">{value}</h3>
      </div>
    </Card>
  );
}

function HealthItem({ label, status, value, color, dot }: any) {
  return (
    <div className="flex items-center justify-between group/item">
      <div className="space-y-3">
        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">{label}</p>
        <div className="flex items-center gap-3">
           <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]", dot)} />
           <p className="text-lg font-black italic uppercase tracking-tight text-foreground italic group-hover/item:text-primary transition-colors">{status}</p>
        </div>
      </div>
      <p className={cn("text-sm font-black italic tracking-widest italic px-4 py-1.5 bg-secondary/40 rounded-lg border border-white/5 shadow-xl", color)}>{value}</p>
    </div>
  );
}
