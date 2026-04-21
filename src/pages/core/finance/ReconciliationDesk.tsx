import React, { useState, useEffect } from 'react';
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
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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
  const { session } = useSession();
  const [statements, setStatements] = useState<any[]>([]);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [bankTxs, setBankTxs] = useState<BankTransaction[]>([]);
  const [unmatchedLedger, setUnmatchedLedger] = useState<LedgerEntry[]>([]);
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransaction | null>(null);
  const [selectedLedgerIds, setSelectedLedgerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStatements();
  }, []);

  useEffect(() => {
    if (selectedStatementId) {
      fetchStatementDetails(selectedStatementId);
    }
  }, [selectedStatementId]);

  const fetchStatements = async () => {
    try {
      // In a real app, we'd list statements. For now, assume we have a list.
      const res = await financeService.getMoneySources(session.tenantId, session);
      // Logic to list statements...
    } catch (error) {
      console.error(error);
    }
  };

  const fetchStatementDetails = async (id: string) => {
    setIsLoading(true);
    try {
      // Fetch transactions for the statement
      // For now, let's assume we have an endpoint for this or use general list
      // Mocking the result for the demo Desk
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoMatch = async () => {
    if (!selectedStatementId) return;
    setIsLoading(true);
    try {
      const res = await financeService.autoMatchTransactions(session, selectedStatementId);
      toast({ title: 'Auto-Match Complete', description: `Matched ${res.matched} transactions.` });
      fetchStatementDetails(selectedStatementId);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualMatch = async () => {
    if (!selectedBankTx || selectedLedgerIds.length === 0) return;
    try {
      await financeService.manualMatchTransactions(session, selectedBankTx.id, selectedLedgerIds);
      toast({ title: 'Match Successful' });
      setSelectedLedgerIds([]);
      fetchStatementDetails(selectedStatementId!);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleFinalize = async () => {
    if (!selectedStatementId) return;
    try {
      await financeService.finalizeReconciliation(session, selectedStatementId);
      toast({ title: 'Statement Finalized' });
      fetchStatements();
    } catch (error: any) {
      toast({ title: 'Finalization Failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      <header className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bank className="w-8 h-8 text-indigo-600" />
            Bank Reconciliation Desk
          </h1>
          <p className="text-slate-500">Reconcile bank statements with your internal ledger</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex gap-2">
            <CloudUpload className="w-4 h-4" /> Import Statement
          </Button>
          <Button onClick={handleAutoMatch} disabled={!selectedStatementId || isLoading} className="bg-indigo-600 hover:bg-indigo-700">
            Auto-Match All
          </Button>
          <Button onClick={handleFinalize} disabled={!selectedStatementId} variant="success">
            Finalize Statement
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Bank Transactions */}
        <Card className="col-span-12 lg:col-span-7 border-none shadow-xl bg-white/80 backdrop-blur-lg">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Bank Statement Transactions</CardTitle>
                <CardDescription>Select a transaction to find matches</CardDescription>
              </div>
              <Badge variant="outline" className="text-indigo-600 border-indigo-200">
                {bankTxs.length} Transactions
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Description</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bankTxs.map((tx) => (
                    <tr 
                      key={tx.id} 
                      onClick={() => setSelectedBankTx(tx)}
                      className={`cursor-pointer transition-colors ${selectedBankTx?.id === tx.id ? 'bg-indigo-50/80 border-l-4 border-l-indigo-500' : 'hover:bg-slate-50'}`}
                    >
                      <td className="p-4 text-sm font-medium">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                      <td className="p-4 text-sm">
                        <div className="font-medium text-slate-900">{tx.description}</div>
                        <div className="text-xs text-slate-400">{tx.reference}</div>
                      </td>
                      <td className="p-4 text-sm font-bold text-right">
                        {tx.amount < 0 ? 
                          <span className="text-red-600">{Math.abs(tx.amount).toLocaleString()}</span> : 
                          <span className="text-emerald-600">{tx.amount.toLocaleString()}</span>
                        }
                      </td>
                      <td className="p-4">
                        <Badge className={`${
                          tx.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' : 
                          tx.status === 'PARTIALLY_MATCHED' ? 'bg-amber-100 text-amber-700' : 
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {bankTxs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                        No transactions found. Please import a statement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right: Ledger Matching */}
        <Card className="col-span-12 lg:col-span-5 border-none shadow-xl bg-slate-900 text-slate-100">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-indigo-400" />
              Match to Ledger
            </CardTitle>
            <CardDescription className="text-slate-400">
              {selectedBankTx ? `Matching: ${selectedBankTx.description}` : 'Select a bank transaction to start matching'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {selectedBankTx ? (
              <>
                <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
                  <Search className="w-4 h-4 text-slate-500" />
                  <Input 
                    placeholder="Search ledger by ref or amount..." 
                    className="bg-transparent border-none focus-visible:ring-0 text-slate-100"
                  />
                </div>

                <div className="space-y-2 overflow-auto max-h-[400px]">
                  {unmatchedLedger.map((entry) => (
                    <div 
                      key={entry.id}
                      onClick={() => {
                        setSelectedLedgerIds(prev => 
                          prev.includes(entry.id) ? prev.filter(id => id !== entry.id) : [...prev, entry.id]
                        )
                      }}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedLedgerIds.includes(entry.id) 
                          ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' 
                          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {entry.ref}
                            {selectedLedgerIds.includes(entry.id) && <CheckCircle className="w-4 h-4 text-indigo-400" />}
                          </div>
                          <div className="text-xs text-slate-400">{entry.description}</div>
                          <div className="text-xs text-slate-500">{new Date(entry.posting_date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold">{entry.amount.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                  <div className="text-sm">
                    <span className="text-slate-400">Selected:</span>{' '}
                    <span className="font-bold text-white">{selectedLedgerIds.length} entries</span>
                  </div>
                  <Button 
                    onClick={handleManualMatch}
                    disabled={selectedLedgerIds.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 w-full lg:w-auto"
                  >
                    Link Selection
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400 max-w-[200px]">
                  Pick a transaction from the left to view potential ledger matches.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
