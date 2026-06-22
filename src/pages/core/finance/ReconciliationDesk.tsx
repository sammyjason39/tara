import React, { useState } from 'react';
import { 
  Bank, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Search,
  CloudUpload,
  Link as LinkIcon,
  Unlink,
  Check
} from 'lucide-react';
import { useSession } from '@/core/security/session';
import { financeService } from '@/core/services/finance/financeService';
import { useCFO } from "@/core/finance/CFOContext";
import { GlobalFinancialFilterBar } from "./components/GlobalFinancialFilterBar";
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/core/api/apiClient';
import { QueryStateWrapper } from '@/components/shared/QueryStateWrapper';

interface BankTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  reference: string;
  status: 'UNMATCHED' | 'PARTIALLY_MATCHED' | 'MATCHED' | 'RECONCILED';
}

interface LedgerEntry {
  id: string;
  ref: string;
  posting_date: string;
  description: string;
  amount: number;
}

export const ReconciliationDesk: React.FC = () => {
  const session = useSession();
  const { state } = useCFO();
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<string[]>([]);

  // Fetch bank statements list via TanStack Query
  const { data: statements = [], isLoading: statementsLoading, isError: statementsError, error: statementsErr, refetch: refetchStatements } = useQuery({
    queryKey: ["finance-reconciliation-statements"],
    queryFn: () => apiRequest<any[]>("/finance/reconciliation/statements", "GET", session),
    staleTime: 30_000,
  });

  // Fetch transactions for selected statement via TanStack Query
  const { data: statementDetails, isLoading: detailsLoading, isError: detailsError, error: detailsErr, refetch: refetchDetails } = useQuery({
    queryKey: ["finance-reconciliation-details", selectedStatementId],
    queryFn: () => apiRequest<{ bankTransactions: BankTransaction[]; unmatchedLedger: LedgerEntry[] }>(
      `/finance/reconciliation/statements/${selectedStatementId}/details`, "GET", session
    ),
    enabled: !!selectedStatementId,
    staleTime: 30_000,
  });

  const bankTxs = statementDetails?.bankTransactions ?? [];
  const unmatchedLedger = statementDetails?.unmatchedLedger ?? [];

  const isLoading = statementsLoading || detailsLoading;

  const handleAutoMatch = async () => {
    if (!selectedStatementId) return;
    try {
      const res = await financeService.autoMatchTransactions(session, selectedStatementId);
      toast({ title: 'Auto-Match Complete', description: `Matched ${res.matched} transactions.` });
      refetchDetails();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleManualMatch = async () => {
    if (!selectedBankTx || selectedLedgerIds.length === 0) return;
    try {
      await financeService.manualMatchTransactions(session, selectedBankTx.id, selectedLedgerIds);
      toast({ title: 'Match Successful' });
      refetchDetails();
      setSelectedLedgerIds([]);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleFinalize = async () => {
    if (!selectedStatementId) return;
    try {
      await financeService.finalizeReconciliation(session, selectedStatementId);
      toast({ title: 'Statement Reconciled' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6 bg-muted min-h-screen">
      <GlobalFinancialFilterBar />

      <header className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-muted-foreground flex items-center gap-2">
            <Bank className="w-8 h-8 text-primary" />
            Bank Reconciliation Desk
          </h1>
          <p className="text-muted-foreground">Reconcile bank statements with your internal ledger</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex gap-2">
            <CloudUpload className="w-4 h-4" /> Import Statement
          </Button>
          <Button onClick={handleAutoMatch} disabled={!selectedStatementId || isLoading} className="bg-primary hover:bg-primary">
            Auto-Match All
          </Button>
          <Button onClick={handleFinalize} disabled={!selectedStatementId} variant="success">
            Finalize Statement
          </Button>
        </div>
      </header>

      <QueryStateWrapper
        isLoading={statementsLoading}
        isError={statementsError}
        error={statementsErr ?? undefined}
        isEmpty={!selectedStatementId && statements.length === 0}
        onRetry={() => refetchStatements()}
        emptyMessage="No bank statements found. Import a statement to begin reconciliation."
      >

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Bank Transactions */}
        <Card className="col-span-12 lg:col-span-7 border-none shadow-xl bg-card/80 backdrop-blur-lg">
          <CardHeader className="border-b bg-muted">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Bank Statement Transactions</CardTitle>
                <CardDescription>Select a transaction to find matches</CardDescription>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                {bankTxs.length} Transactions
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-muted z-10">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                    <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Amount</th>
                    <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(bankTxs) ? bankTxs : []).map((tx) => (
                    <tr 
                      key={tx.id} 
                      onClick={() => setSelectedBankTx(tx)}
                      className={`cursor-pointer hover:bg-primary transition-colors ${selectedBankTx?.id === tx.id ? 'bg-primary border-l-4 border-primary' : 'border-b border-border'}`}
                    >
                      <td className="p-4 text-sm font-medium">{tx.transaction_date}</td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-muted-foreground">{tx.description}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{tx.reference}</div>
                      </td>
                      <td className={`p-4 text-sm font-black text-right ${tx.amount < 0 ? 'text-destructive' : 'text-success'}`}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount)}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={
                          tx.status === 'MATCHED' ? 'bg-success text-success border-success/30' : 
                          tx.status === 'PARTIALLY_MATCHED' ? 'bg-warning text-warning border-warning/30' : 
                          'bg-muted text-muted-foreground border-border'
                        }>
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Matches & Ledger */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <Card className="border-none shadow-xl bg-card/80 backdrop-blur-lg border-l-4 border-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                Manual Matching
              </CardTitle>
              <CardDescription>
                {selectedBankTx 
                  ? `Matching: ${selectedBankTx.description} (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedBankTx.amount)})`
                  : 'Select a bank transaction to begin matching'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedBankTx ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary border border-primary space-y-2">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-primary">
                      <span>Total Selected</span>
                      <span>Target Difference</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <div className="text-2xl font-black text-primary">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                          (Array.isArray(unmatchedLedger) ? unmatchedLedger : []).filter(l => selectedLedgerIds.includes(l.id)).reduce((acc, l) => acc + l.amount, 0)
                        )}
                      </div>
                      <div className={`text-sm font-bold ${
                        Math.abs(selectedBankTx.amount - (Array.isArray(unmatchedLedger) ? unmatchedLedger : []).filter(l => selectedLedgerIds.includes(l.id)).reduce((acc, l) => acc + l.amount, 0)) < 0.01
                          ? 'text-success'
                          : 'text-destructive'
                      }`}>
                        Δ {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                          selectedBankTx.amount - (Array.isArray(unmatchedLedger) ? unmatchedLedger : []).filter(l => selectedLedgerIds.includes(l.id)).reduce((acc, l) => acc + l.amount, 0)
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleManualMatch} 
                    disabled={selectedLedgerIds.length === 0}
                    className="w-full bg-primary hover:bg-primary h-12 text-lg font-bold"
                  >
                    Confirm Match ({selectedLedgerIds.length})
                  </Button>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-border rounded-xl text-muted-foreground italic">
                  Select a bank transaction on the left
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-card/80 backdrop-blur-lg">
            <CardHeader className="bg-muted border-b">
              <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Unmatched Ledger Entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[400px]">
                {(Array.isArray(unmatchedLedger) ? unmatchedLedger : []).map((entry) => (
                  <div 
                    key={entry.id}
                    onClick={() => {
                      if (selectedLedgerIds.includes(entry.id)) {
                        setSelectedLedgerIds(prev => (Array.isArray(prev) ? prev : []).filter(id => id !== entry.id));
                      } else {
                        setSelectedLedgerIds(prev => [...prev, entry.id]);
                      }
                    }}
                    className={`p-4 border-b border-border cursor-pointer hover:bg-muted transition-colors flex justify-between items-center ${selectedLedgerIds.includes(entry.id) ? 'bg-success' : ''}`}
                  >
                    <div>
                      <div className="text-sm font-bold text-muted-foreground">{entry.description}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{entry.ref} • {entry.posting_date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-black text-muted-foreground">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(entry.amount)}
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        selectedLedgerIds.includes(entry.id) ? 'bg-success border-success' : 'border-border'
                      }`}>
                        {selectedLedgerIds.includes(entry.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </QueryStateWrapper>
    </div>
  );
};
