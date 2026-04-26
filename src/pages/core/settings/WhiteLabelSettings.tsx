import React, { useState, useEffect } from "react";
import { 
  Palette, 
  Upload, 
  Globe, 
  Shield, 
  Save, 
  RefreshCcw,
  Layout,
  Type,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function WhiteLabelSettings() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    logoUrl: "https://api.zenvix.ai/placeholder-logo.png",
    primaryColor: "#6366f1",
    agencyName: "Zenvix Marketing Pro",
    customDomain: "",
    enableWhiteLabel: true,
    removePoweredBy: false,
    customCss: "",
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("White-label settings updated successfully");
    }, 1000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Agency White-Labeling</h1>
          <p className="text-slate-500 mt-2">Personalize the Zenvix experience for your clients and sub-accounts.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Reset
          </Button>
          <Button onClick={handleSave} loading={loading} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="branding" className="w-full">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
              <TabsTrigger value="branding" className="rounded-lg gap-2">
                <Palette className="h-4 w-4" /> Branding
              </TabsTrigger>
              <TabsTrigger value="domain" className="rounded-lg gap-2">
                <Globe className="h-4 w-4" /> Domain & SEO
              </TabsTrigger>
              <TabsTrigger value="advanced" className="rounded-lg gap-2">
                <Shield className="h-4 w-4" /> Security & Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="space-y-6">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layout className="h-5 w-5 text-indigo-500" />
                    Visual Identity
                  </CardTitle>
                  <CardDescription>Configure how your agency appears to clients.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Agency Name</Label>
                      <Input 
                        value={config.agencyName} 
                        onChange={(e) => setConfig({...config, agencyName: e.target.value})}
                        placeholder="e.g. Acme Marketing Solutions"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Brand Color</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="color" 
                          value={config.primaryColor} 
                          onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                          className="w-12 p-1 h-10"
                        />
                        <Input 
                          value={config.primaryColor} 
                          onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Agency Logo</Label>
                    <div className="flex items-center gap-6 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                      <div className="h-16 w-16 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden">
                        <img src={config.logoUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Click to upload or drag and drop</p>
                        <p className="text-xs text-slate-500">SVG, PNG, or JPG (max. 800x400px)</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Upload className="h-4 w-4" /> Upload
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Type className="h-5 w-5 text-indigo-500" />
                    Custom Typography & Styles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Custom CSS</Label>
                    <textarea 
                      className="w-full min-h-[120px] p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-sm"
                      placeholder="/* Add custom dashboard styles here */"
                      value={config.customCss}
                      onChange={(e) => setConfig({...config, customCss: e.target.value})}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="domain" className="space-y-6">
              <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-500" />
                    Custom Domain Configuration
                  </CardTitle>
                  <CardDescription>Host the dashboard on your own subdomain with full SSL support.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Subdomain / Custom Domain</Label>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="app.myagency.com" 
                        value={config.customDomain}
                        onChange={(e) => setConfig({...config, customDomain: e.target.value})}
                      />
                      <Button variant="outline" className="gap-2">
                        <RefreshCcw className="h-4 w-4" /> Verify DNS
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Required DNS Records</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-indigo-500">CNAME</span>
                          <span className="text-slate-400">Value: lb.zenvix.ai</span>
                        </div>
                        <div className="h-10 bg-white dark:bg-slate-900 border rounded flex items-center px-3 justify-between">
                          <code className="text-xs">{config.customDomain || "app.your-agency.com"}</code>
                          <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/20 bg-orange-500/5">Pending</Badge>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-900/50 rounded-lg">
                        <div className="flex gap-3">
                          <Shield className="h-5 w-5 text-amber-500 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">SSL Certificate Generation</p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-500 leading-relaxed">
                              Once DNS is verified, we will automatically provision an SSL certificate for your domain. This process can take up to 24 hours.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 dark:bg-slate-800/50 p-4">
                   <p className="text-[11px] text-slate-500">
                     Note: Full custom domain routing requires infrastructure-level proxy configuration. Our team will finalize the setup within 48 hours of DNS verification.
                   </p>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
               <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Enable White-Labeling</Label>
                      <p className="text-sm text-slate-500">Apply custom branding to all sub-accounts.</p>
                    </div>
                    <Switch 
                      checked={config.enableWhiteLabel} 
                      onCheckedChange={(checked) => setConfig({...config, enableWhiteLabel: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Remove "Powered by Zenvix"</Label>
                      <p className="text-sm text-slate-500">Hide Zenvix branding from footer and login pages.</p>
                    </div>
                    <Switch 
                      checked={config.removePoweredBy} 
                      onCheckedChange={(checked) => setConfig({...config, removePoweredBy: checked})}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Preview */}
        <div className="space-y-6">
          <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-lg sticky top-8 bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-indigo-500" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="aspect-[4/5] w-full bg-slate-100 dark:bg-slate-950 p-4">
                <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                  {/* Top Nav Preview */}
                  <div className="h-10 border-b border-slate-100 dark:border-slate-800 px-3 flex items-center justify-between">
                    <img src={config.logoUrl} className="h-5 object-contain" alt="Logo" />
                    <div className="flex gap-1">
                      <div className="h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800" />
                      <div className="h-4 w-4 rounded-full bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                  
                  {/* Content Preview */}
                  <div className="flex-1 p-4 space-y-4">
                    <div className="h-6 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-20 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col p-3 gap-2">
                         <div className="h-3 w-12 rounded bg-slate-200 dark:bg-slate-700" />
                         <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700" style={{ backgroundColor: config.primaryColor + '44' }} />
                      </div>
                      <div className="h-20 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700" />
                    </div>
                    <div className="h-32 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center gap-3">
                       <Button size="sm" style={{ backgroundColor: config.primaryColor }}>Preview Button</Button>
                       <p className="text-[10px] text-slate-400">Branding preview active</p>
                    </div>
                  </div>

                  {/* Powered By Footer */}
                  {!config.removePoweredBy && (
                    <div className="h-6 flex items-center justify-center text-[8px] text-slate-400 border-t border-slate-50 dark:border-slate-800">
                      Powered by Zenvix AI
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="py-4 px-6 bg-slate-50/50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 leading-relaxed text-center w-full">
                This preview shows how your branding will appear in the main client dashboard.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
