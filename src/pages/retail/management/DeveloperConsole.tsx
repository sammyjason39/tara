import React, { useState } from "react";
import { 
  Play, 
  Code2, 
  Braces, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Copy,
  Server
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

// Import the Simulated Gateway directly (in real app, this would be an HTTP fetch)
import { retailGateway } from "@/modules/retail/api/RetailPublicGateway";
import type { ApiAuthHeaders } from "@/core/types/retail/api";

const DeveloperConsole = ({ 
  defaultClientId = "",
  defaultClientSecret = ""
}: { 
  defaultClientId?: string; 
  defaultClientSecret?: string;
}) => {
  const { toast } = useToast();
  
  // Request State
  const [method, setMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState("/products");
  const [clientId, setClientId] = useState(defaultClientId);
  const [clientSecret, setClientSecret] = useState(defaultClientSecret);
  const [requestBody, setRequestBody] = useState(JSON.stringify({
    externalReference: "ORD-EXT-001",
    items: [
      { sku: "COF-AR-001", quantity: 2 }
    ],
    customer: {
      name: "John Doe",
      email: "john@example.com"
    },
    paymentStatus: "PAID"
  }, null, 2));

  // Response State
  const [response, setResponse] = useState<any>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const endpoints = [
    { value: "/products", method: "GET", label: "Get Inventory" },
    { value: "/orders", method: "POST", label: "Create Order" },
    { value: "/orders/:id", method: "GET", label: "Get Order Status" },
  ];

  const handleEndpointChange = (val: string) => {
    setEndpoint(val);
    const ep = endpoints.find(e => e.value === val);
    if (ep) setMethod(ep.method);
  };

  const executeRequest = async () => {
    setIsLoading(true);
    setResponse(null);
    setStatus(null);

    // Simulate Network Latency
    await new Promise(r => setTimeout(r, 600));

    try {
      const headers: ApiAuthHeaders = {
        "x-client-id": clientId,
        "x-client-secret": clientSecret
      };

      let result;
      // Routing Logic (Gateway Dispatcher)
      if (endpoint === "/products" && method === "GET") {
        result = await retailGateway.getProducts("demo-tenant", headers);
      } else if (endpoint === "/orders" && method === "POST") {
        const body = JSON.parse(requestBody);
        result = await retailGateway.createOrder("demo-tenant", headers, body);
      } else {
        throw { code: 404, error: "Not Found", details: "Endpoint not implemented in simulation" };
      }

      // Check for Gateway Error Object
      if ((result as any).error) {
         throw result;
      }

      setResponse(result);
      setStatus(200);
      toast({ title: "Request Successful", description: `API returned 200 OK` });

    } catch (e: any) {
      console.error(e);
      setStatus(e.code || 500);
      setResponse(e);
      toast({ title: "Request Failed", description: e.error || "Unknown Error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
      {/* Request Panel */}
      <div className="space-y-4 flex flex-col h-full">
        <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Request Configuration</span>
          </div>

          <div className="grid grid-cols-[100px_1fr] gap-2">
            <div className="bg-slate-200 rounded-xl flex items-center justify-center font-black text-slate-600">
               {method}
            </div>
            <Select value={endpoint} onValueChange={handleEndpointChange}>
              <SelectTrigger className="h-12 rounded-xl font-mono text-xs font-bold">
                 <SelectValue />
              </SelectTrigger>
              <SelectContent>
                 {endpoints.map(ep => (
                   <SelectItem key={ep.value} value={ep.value}>
                      <span className="font-mono">{ep.value}</span> 
                      <span className="text-slate-400 ml-2 text-[10px] uppercase">({ep.label})</span>
                   </SelectItem>
                 ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between">
                <Label className="text-[10px] font-black uppercase text-slate-400">Headers</Label>
             </div>
             <div className="grid grid-cols-1 gap-2">
               <Input 
                 placeholder="x-client-id" 
                 value={clientId} 
                 onChange={e => setClientId(e.target.value)}
                 className="h-10 font-mono text-xs rounded-lg"
               />
               <Input 
                 placeholder="x-client-secret" 
                 value={clientSecret} 
                 onChange={e => setClientSecret(e.target.value)}
                 type="password"
                 className="h-10 font-mono text-xs rounded-lg"
               />
             </div>
          </div>

          {method === "POST" && (
            <div className="flex-1 flex flex-col min-h-[200px]">
              <div className="flex justify-between mb-2">
                 <Label className="text-[10px] font-black uppercase text-slate-400">Request Body (JSON)</Label>
                 <Braces className="w-3 h-3 text-slate-400" />
              </div>
              <textarea
                className="flex-1 w-full bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={requestBody}
                onChange={e => setRequestBody(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}
        </div>

        <Button 
          onClick={executeRequest}
          disabled={isLoading}
          className="h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black italic uppercase tracking-widest shadow-xl"
        >
           {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2 fill-current" />}
           Send Request
        </Button>
      </div>

      {/* Response Panel */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 text-white p-6 flex flex-col h-full overflow-hidden">
         <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
               <Code2 className="w-5 h-5 text-indigo-400" />
               <span className="text-xs font-black uppercase tracking-widest text-slate-500">Response Output</span>
            </div>
            {status && (
               <div className={`px-2 py-1 rounded-md text-[10px] font-black ${status >= 200 && status < 300 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  HTTP {status}
               </div>
            )}
         </div>

         <div className="flex-1 bg-black/50 rounded-xl p-4 overflow-auto border border-white/5 relative group">
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => {
                if (response) {
                   navigator.clipboard.writeText(JSON.stringify(response, null, 2));
                   toast({ title: "Copied JSON" });
                }
              }}
            >
               <Copy className="w-4 h-4 text-slate-500" />
            </Button>
            
            {response ? (
               <pre className="text-xs font-mono text-blue-300 leading-relaxed">
                  {JSON.stringify(response, null, 2)}
               </pre>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-600">
                  <Server className="w-12 h-12 mb-4 opacity-20" />
                  <div className="font-bold uppercase text-[10px] tracking-widest">Awaiting Request</div>
               </div>
            )}
         </div>
         
         {status === 200 && (
            <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-900/50 rounded-lg flex items-start gap-3">
               <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
               <div className="text-[10px] text-emerald-400">
                  <span className="font-bold">Success:</span> Logic executed successfully. Inventory/Orders have been updated in the internal system.
               </div>
            </div>
         )}
         {status && status >= 400 && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3">
               <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
               <div className="text-[10px] text-red-400">
                  <span className="font-bold">Error:</span> {response?.details || "Request failed"}
               </div>
            </div>
         )}
      </div>
    </div>
  );
};

export default DeveloperConsole;
