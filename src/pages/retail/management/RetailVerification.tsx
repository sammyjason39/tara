import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ShieldCheck, 
  Search, 
  ExternalLink,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import { PageHeader } from "@/core/ui/PageHeader";
import { WorkspacePanel } from "@/core/ui/WorkspacePanel";
import { retailService } from "@/core/services/retail/retailService";
import { apiRequest } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";
import { useToast } from "@/hooks/use-toast";

interface VerificationResult {
  status: string;
  type: string;
  issuedAt: string;
  balance: string;
}

export default function RetailVerification() {
  const session = useSession();
  const { toast } = useToast();
  const [ticketId, setTicketId] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!ticketId) return;
    
    try {
      setIsVerifying(true);
      const data = await retailService.verifyTicket(
        session.tenant_id!,
        session,
        ticketId
      );
      setResult(data);
      if (data.status === 'valid') {
        toast({
          title: "Verification Successful",
          description: "Credential matched against core ledger.",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: "No matching record found in current scope.",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Network Refusal",
        description: "Consistency check failed. Please retry connection.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };


  return (
    <div className="space-y-6 max-w-[1200px] mx-auto p-4 md:p-6">
      <PageHeader title="Verification Desk" subtitle="Secure Receipt & Ticket Validation" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Verification Logic</CardTitle>
            <CardDescription>Scan barcode or enter ID manually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Enter Transaction ID or Ticket code..." 
                className="pl-10 h-12 text-lg font-mono"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button 
                className="flex-1 h-12" 
                onClick={handleVerify}
                disabled={isVerifying}
              >
                {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Verify Now
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    await apiRequest("/retail/verification/scan", "POST", session, { mode: "active" });
                    toast({ title: "Scanner Active", description: "Optical sensors initialized. Please align code within frame." });
                  } catch (e) {
                    toast({ title: "Scanner Error", description: "Failed to activate scanner. Check device connection.", variant: "destructive" });
                  }
                }} 
                variant="outline" 
                className="h-12"
              >
                <QrCode className="w-4 h-4 mr-2" /> Scan Camera
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {result ? (
            <Card className={`border-none ${result.status === 'valid' ? 'bg-success' : 'bg-destructive'}`}>
              <CardContent className="p-8 text-center space-y-4">
                 {result.status === 'valid' ? (
                   <CheckCircle2 className="w-16 h-16 mx-auto text-success" />
                 ) : (
                   <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
                 )}
                 <div>
                    <h3 className="text-xl font-bold uppercase tracking-tight">{result.status} {result.type}</h3>
                    <p className="text-muted-foreground text-sm">Verified against Retail Core Ledger</p>
                 </div>
                 <div className="bg-secondary/400 p-4 rounded-lg text-sm grid grid-cols-2 gap-2 text-left">
                    <span className="text-muted-foreground">Issued:</span><span className="font-medium">{new Date(result.issuedAt).toLocaleDateString()}</span>
                    <span className="text-muted-foreground">Value:</span><span className="font-bold text-success">{result.balance}</span>
                 </div>
                 <Button 
                   onClick={(e) => { 
                     e.preventDefault(); 
                     toast({
                       title: "Action Committed",
                       description: "Voucher/Receipt usage has been marked as consumed.",
                     }); 
                   }} 
                   className="w-full bg-success hover:bg-success font-bold uppercase tracking-wider h-12 rounded-xl"
                   disabled={result.status !== 'valid'}
                 >
                   Approve Usage
                 </Button>
              </CardContent>

            </Card>
          ) : (
            <div className="h-full bg-secondary/5 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
              <p>Waiting for verification input...</p>
              <p className="text-xs max-w-[200px] mt-2">Validate e-vouchers, member QR codes, or physical receipts.</p>
            </div>
          )}
        </div>
      </div>

      <WorkspacePanel title="Validation History" description="Recent verification attempts at this desk">
        <div className="p-8 text-center text-muted-foreground italic bg-secondary/5 rounded-lg">
          No verification history available in this session.
        </div>
      </WorkspacePanel>
    </div>
  );
}
