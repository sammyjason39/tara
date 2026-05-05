import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Clock, 
  Calendar, 
  Wallet, 
  ShieldCheck, 
  MapPin, 
  Play, 
  Square,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Info,
  History,
  FileText,
  Download,
  DollarSign,
  HandCoins,
  Receipt,
  Briefcase
} from 'lucide-react';
import { useSession } from '@/core/security/session';
import { useApp } from '@/contexts/AppContext';
import { attendanceService } from '@/core/services/hr/attendanceService';
import { leaveService } from '@/core/services/hr/leaveService';
import { peopleService } from '@/core/services/hr/peopleService';
import { loanService } from '@/core/services/finance/loanService';
import { payrollService } from '@/core/services/hr/payrollService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate, formatTime } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

export default function MyPulse({ noShell = false }: { noShell?: boolean }) {
  const session = useSession();
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Attendance State
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [clockInReason, setClockInReason] = useState('');
  const [isLocationMismatch, setIsLocationMismatch] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);

  // Loan State
  const [isLoanOpen, setIsLoanOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState('');
  const [loanInstallments, setLoanInstallments] = useState('12');
  const [loanReason, setLoanReason] = useState('');
  const [myLoans, setMyLoans] = useState<any[]>([]);

  // Performance State
  const [perfSnapshot, setPerfSnapshot] = useState<any>(null);

  // Docs State
  const [docs, setDocs] = useState<any[]>([
    { id: 'p1', title: 'Payslip - March 2026', type: 'PAYSLIP', date: '2026-03-28' },
    { id: 'p2', title: 'Payslip - February 2026', type: 'PAYSLIP', date: '2026-02-28' },
    { id: 'c1', title: 'Employment Contract - v2', type: 'CONTRACT', date: '2025-01-10' },
    { id: 'd1', title: 'Code of Conduct', type: 'POLICY', date: '2026-01-01' },
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pRecord, loans, snapshot] = await Promise.all([
          peopleService.getEmployee360(session.tenant_id, session.user_id, session),
          loanService.getMyLoans(session.tenant_id, session),
          payrollService.getPerformanceSnapshot(session.tenant_id, session, session.user_id)
        ]);
        setRecord(pRecord);
        setMyLoans(loans || []);
        setPerfSnapshot(snapshot);
      } catch (err) {
        toast({
          title: "Portal Sync Error",
          description: "Unable to refresh your profile telemetry.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [session]);

  const handleClockIn = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Telemetry Required",
        description: "GPS access is mandatory for attendance verification.",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCurrentCoords(coords);

      // Verify location against policy (Stubbed for now, but wired)
      const isValidLocation = await attendanceService.validateAccess(
        session.tenant_id,
        record?.employee?.locationId || 'HQ',
        'MY_PULSE_PORTAL',
        coords
      );

      if (!isValidLocation && !clockInReason) {
        setIsLocationMismatch(true);
        setIsClockingIn(true);
        return;
      }

      try {
        await attendanceService.clockIn(session.tenant_id, session, {
          locationId: record?.employee?.locationId || 'HQ',
          deviceId: 'MY_PULSE_WEB',
          coordinates: coords,
          verificationMethod: 'gps',
          reason: clockInReason
        });

        toast({
          title: "Attendance Registered",
          description: "Your check-in has been synchronized with the roster.",
        });
        
        setIsClockingIn(false);
        setClockInReason('');
        // Refresh record...
      } catch (err) {
        toast({
          title: "Clock-In Failed",
          description: "The attendance service is currently unreachable.",
          variant: "destructive"
        });
      }
    });
  };

  const handleRequestLoan = async () => {
    try {
      await loanService.requestLoan(session.tenant_id, session, {
        amount: Number(loanAmount),
        installments: Number(loanInstallments),
        reason: loanReason
      });
      toast({ title: "Loan Request Indexed", description: "Your request has been sent to HOD FlowGate." });
      setIsLoanOpen(false);
      // Refresh...
    } catch (err) {
      toast({ title: "Request Failed", variant: "destructive" });
    }
  };

  const activeLoan = useMemo(() => myLoans.find(l => l.status === 'approved' || l.status === 'disbursed'), [myLoans]);

  const isRetailOrSales = useMemo(() => {
    const role = record?.employee?.roleTitle?.toLowerCase() || '';
    return role.includes('cashier') || role.includes('sales') || role.includes('store manager');
  }, [record]);

  if (isLoading) return <div className="p-8 text-center font-black italic animate-pulse">SYNCHRONIZING PORTAL...</div>;

  const content = (
    <div className={cn("space-y-8", !noShell && "max-w-7xl mx-auto")}>
      {!noShell && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
                <User className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{record?.employee?.fullName}</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Briefcase className="w-3 h-3" /> {record?.employee?.roleTitle} • {record?.employee?.departmentId}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Badge variant="outline" className="h-10 px-4 rounded-xl border-slate-200 bg-white font-bold text-slate-700 uppercase tracking-widest gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE_ROSTER
             </Badge>
             <Button 
                className="h-14 px-8 rounded-2xl font-black italic tracking-widest uppercase text-xs bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 gap-3"
                onClick={() => setIsClockingIn(true)}
             >
                <Play className="w-5 h-5" /> Clock In
             </Button>
             <Button 
                variant="outline"
                className="h-14 px-6 rounded-2xl font-black italic tracking-widest uppercase text-[10px] border-slate-200 bg-white hover:bg-slate-50 gap-2 shadow-sm"
                onClick={() => setIsLoanOpen(true)}
             >
                <HandCoins className="w-4 h-4 text-indigo-600" /> Loan Request
             </Button>
          </div>
        </div>
      )}

      {/* Tabbed Experience */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start h-auto p-0 gap-8 rounded-none">
          {['overview', 'attendance', 'payroll', 'leave', 'performance'].map((tab) => (
            <TabsTrigger 
              key={tab}
              value={tab} 
              className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none h-12 px-2 font-black uppercase italic tracking-widest text-[10px] text-slate-400 transition-all border-b-4 border-transparent"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Duty Card */}
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                 <CardHeader className="bg-slate-900 text-white p-6">
                    <div className="flex items-center justify-between">
                       <CardTitle className="text-lg font-black italic uppercase tracking-wider">Today's Duty</CardTitle>
                       <Clock className="w-5 h-5 text-indigo-400" />
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Window</p>
                       <p className="text-2xl font-black text-slate-900">09:00 - 18:00</p>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                       <MapPin className="w-4 h-4" />
                       <span className="text-xs font-bold uppercase tracking-widest">{record?.employee?.locationId || 'HQ_ZONE_A'}</span>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                       <Badge className="bg-slate-100 text-slate-600 border-transparent font-bold text-[10px] uppercase">Normal Operation</Badge>
                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest cursor-pointer hover:underline">View Schedule</span>
                    </div>
                 </CardContent>
              </Card>

              {/* Wallet Preview */}
              <Card className="border-slate-200 shadow-sm">
                 <CardHeader className="p-6">
                    <div className="flex items-center justify-between">
                       <CardTitle className="text-lg font-black italic uppercase tracking-wider">Payroll Track</CardTitle>
                       <Wallet className="w-5 h-5 text-emerald-600" />
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Net Payout (Est.)</p>
                       <p className="text-3xl font-black text-slate-900">
                         {formatCurrency(
                           (record?.employee?.baseSalary || 4500) + 
                           (perfSnapshot?.accruedBonus || 0) - 
                           (perfSnapshot?.estimatedTax || 850) - 
                           (activeLoan?.monthlyInstallment || 0)
                         )}
                       </p>
                    </div>
                    
                    <div className="space-y-4">
                       {isRetailOrSales && (
                         <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                               <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Items Sold</p>
                               <p className="text-lg font-black text-indigo-900">{perfSnapshot?.itemsSold || 142}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                               <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Bonus</p>
                               <p className="text-lg font-black text-emerald-900">+{formatCurrency(perfSnapshot?.accruedBonus || 450)}</p>
                            </div>
                         </div>
                       )}

                       <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                             <div className="flex items-center gap-2 text-slate-500">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase">Est. Tax & Social</span>
                             </div>
                             <span className="text-xs font-black text-slate-700">-{formatCurrency(perfSnapshot?.estimatedTax || 850)}</span>
                          </div>

                          {activeLoan && (
                            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                               <div className="flex items-center gap-2 text-amber-600">
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase">Loan Installment</span>
                               </div>
                               <span className="text-xs font-black text-amber-900">-{formatCurrency(activeLoan.monthlyInstallment)}</span>
                            </div>
                          )}
                       </div>

                       <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                             <span className="text-slate-400">Cycle Progress</span>
                             <span className="text-slate-900">75%</span>
                          </div>
                          <Progress value={75} className="h-2 bg-slate-100" />
                       </div>
                    </div>
                 </CardContent>
              </Card>

              {/* Compliance Signal */}
              <Card className="border-slate-200 shadow-sm bg-indigo-600 text-white">
                 <CardHeader className="p-6">
                    <div className="flex items-center justify-between">
                       <CardTitle className="text-lg font-black italic uppercase tracking-wider">Compliance</CardTitle>
                       <ShieldCheck className="w-5 h-5 text-indigo-200" />
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                       </div>
                       <div>
                          <p className="text-xs font-black uppercase tracking-widest">All Records Sync</p>
                          <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">Last audit: 2h ago</p>
                       </div>
                    </div>
                    <Button variant="outline" className="w-full bg-white/10 border-white/20 hover:bg-white/20 text-white font-black italic uppercase tracking-widest text-[10px] rounded-xl h-10 mt-2">
                       View Audit Passport
                    </Button>
                 </CardContent>
              </Card>
           </div>

           {/* Recent Activity Mini-Feed */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="border-slate-200 shadow-sm">
                 <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div className="space-y-1">
                       <CardTitle className="text-md font-black italic uppercase tracking-wider">Attendance Ledger</CardTitle>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Last 5 records</p>
                    </div>
                    <History className="w-5 h-5 text-slate-400" />
                 </CardHeader>
                 <CardContent className="p-0">
                    {(record?.attendance || []).slice(0, 5).map((entry: any, i: number) => (
                      <div key={entry.id} className={cn("p-4 flex items-center justify-between", i !== 4 && "border-b border-slate-50")}>
                         <div className="flex items-center gap-3">
                            <div className={cn("w-2 h-2 rounded-full", entry.status === 'on_time' ? 'bg-emerald-500' : 'bg-amber-500')} />
                            <div>
                               <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{entry.date}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{entry.status}</p>
                            </div>
                         </div>
                         <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    ))}
                    <div className="p-4 bg-slate-50/50 text-center">
                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest cursor-pointer hover:underline" onClick={() => setActiveTab('attendance')}>Full Attendance History</span>
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                 <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div className="space-y-1">
                       <CardTitle className="text-md font-black italic uppercase tracking-wider">Document Vault</CardTitle>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Payslips & Contracts</p>
                    </div>
                    <FileText className="w-5 h-5 text-slate-400" />
                 </CardHeader>
                 <CardContent className="p-0">
                    {docs.slice(0, 4).map((doc: any, i: number) => (
                      <div key={doc.id} className={cn("p-4 flex items-center justify-between", i !== 3 && "border-b border-slate-50")}>
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
                               {doc.type === 'PAYSLIP' ? <Receipt className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            </div>
                            <div>
                               <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{doc.title}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{doc.date}</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <Download className="w-4 h-4" />
                         </Button>
                      </div>
                    ))}
                    <div className="p-8 text-center border-t border-slate-50">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Secured by VaultCore™</p>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>

        <TabsContent value="attendance">
           <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                 <CardTitle className="text-xl font-black italic uppercase tracking-wider">Attendance Archetype</CardTitle>
                 <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-500">Comprehensive verification history and operational telemetry.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          <tr>
                             <th className="p-6">Verification Node</th>
                             <th className="p-6">Timestamp</th>
                             <th className="p-6">Status Signal</th>
                             <th className="p-6">Telemetry</th>
                          </tr>
                       </thead>
                       <tbody className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {(record?.attendance || []).map((entry: any) => (
                            <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50/30 transition-colors">
                               <td className="p-6 flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                  {entry.date}
                               </td>
                               <td className="p-6">{formatTime(entry.checkIn?.timestamp || entry.timestamp)}</td>
                               <td className="p-6">
                                  <Badge className={cn(
                                     "font-black text-[9px] uppercase tracking-widest",
                                     entry.status === 'on_time' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                  )}>
                                     {entry.status}
                                  </Badge>
                               </td>
                               <td className="p-6 text-slate-400 font-mono text-[10px]">{entry.checkIn?.deviceId || 'MOBILE_CORE'}</td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        {/* Other Tabs Stubs for Phase 1 Migration */}
        {['payroll', 'leave', 'performance'].map((tab) => (
          <TabsContent key={tab} value={tab}>
             <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <Info className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-wider text-slate-400">{tab.toUpperCase()} NODE</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2">Undergoing Operational Migration</p>
             </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );

  if (noShell) return content;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 selection:bg-indigo-500/30">
      {content}

      {/* Clock In Logic - Verification Sheet */}
      <Dialog open={isClockingIn} onOpenChange={setIsClockingIn}>
        <DialogContent className="max-w-md bg-white border-slate-200 p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
               </div>
               <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Attendance Protocol</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
               Securing telemetry for verification method: GPS_VERIFIED
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6">
            {isLocationMismatch && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-4">
                 <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                 <div className="space-y-1">
                    <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Geofence Mismatch Detected</p>
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest leading-relaxed">
                       Your current coordinates do not match the assigned workplace: <strong>{record?.employee?.locationId || 'BRANCH_A'}</strong>. 
                       An audit reason is required for administrative synchronization.
                    </p>
                 </div>
              </div>
            )}

            <div className="space-y-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Duty Location</Label>
                  <div className="h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                     {record?.employee?.locationId || 'CENTRAL_HQ_ZONE_A'}
                  </div>
               </div>

               {isLocationMismatch && (
                 <div className="space-y-2 animate-in zoom-in-95 duration-300">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Deviation</Label>
                    <Textarea 
                       className="border-slate-200 rounded-xl font-bold text-xs" 
                       placeholder="e.g. Field assignment, Offsite maintenance, Hardware sync error..."
                       value={clockInReason}
                       onChange={(e) => setClockInReason(e.target.value)}
                    />
                 </div>
               )}
            </div>

            <div className="pt-4 flex flex-col gap-3">
               <Button 
                  className={cn(
                    "w-full h-14 rounded-2xl font-black italic uppercase tracking-widest transition-all",
                    isLocationMismatch ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                  )}
                  onClick={handleClockIn}
               >
                  Authorize Check-In
               </Button>
               <Button variant="ghost" className="text-[10px] font-black text-slate-400 uppercase tracking-widest h-10" onClick={() => { setIsClockingIn(false); setIsLocationMismatch(false); }}>
                  Cancel Session
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loan Request Logic - Financial Sheet */}
      <Dialog open={isLoanOpen} onOpenChange={setIsLoanOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <HandCoins className="w-6 h-6 text-white" />
               </div>
               <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Finance Protocol</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
               Initializing loan request via FlowGate verification.
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Principal Amount</Label>
                  <div className="relative">
                     <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <Input 
                        type="number" 
                        className="pl-9 h-12 border-slate-200 rounded-xl font-black italic text-lg" 
                        placeholder="0.00"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                     />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Installments</Label>
                     <select 
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black uppercase"
                        value={loanInstallments}
                        onChange={(e) => setLoanInstallments(e.target.value)}
                     >
                        <option value="6">6 Months</option>
                        <option value="12">12 Months</option>
                        <option value="24">24 Months</option>
                        <option value="36">36 Months</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Est.</Label>
                     <div className="h-12 flex items-center px-4 bg-slate-100 rounded-xl font-black text-xs text-slate-900">
                        {formatCurrency(Math.round(Number(loanAmount || 0) / Number(loanInstallments)))}
                     </div>
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loan Purpose</Label>
                  <Textarea 
                     className="border-slate-200 rounded-xl font-bold text-xs" 
                     placeholder="State the purpose for administrative review..."
                     value={loanReason}
                     onChange={(e) => setLoanReason(e.target.value)}
                  />
               </div>
            </div>

            <div className="p-4 bg-indigo-50 rounded-2xl flex gap-3">
               <Info className="w-5 h-5 text-indigo-600 shrink-0" />
               <p className="text-[9px] font-bold text-indigo-700 uppercase leading-relaxed">
                  Requests are routed to <strong>HOD, Finance, and HR</strong>. 
                  Approvals are irreversible once disbursed. 
                  <strong>Owner Bypass</strong> active for direct verification.
               </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
               <Button 
                  className="w-full h-14 rounded-2xl font-black italic uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                  onClick={handleRequestLoan}
                  disabled={!loanAmount || !loanReason}
               >
                  Transmit Request
               </Button>
               <Button variant="ghost" className="text-[10px] font-black text-slate-400 uppercase tracking-widest h-10" onClick={() => setIsLoanOpen(false)}>
                  Cancel Session
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
