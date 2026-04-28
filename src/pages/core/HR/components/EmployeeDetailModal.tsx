import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Clock, 
  Wallet, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  History,
  MapPin,
  Briefcase
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatDate } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  record: any; // The full 360 record
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  employee, 
  record 
}) => {
  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-8 bg-slate-900 text-white shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                <User className="w-8 h-8" />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter">
                  {employee.fullName}
                </DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                  {employee.roleTitle} • {employee.departmentId} • {employee.employeeCode}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
               <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1 rounded-lg font-black uppercase text-[10px]">
                  {employee.status}
               </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          <Tabs defaultValue="identity" className="flex-1 flex flex-col">
            <div className="px-8 border-b border-slate-100 bg-slate-50/50">
              <TabsList className="h-14 bg-transparent p-0 gap-8">
                {[
                  { id: 'identity', icon: User, label: 'Core Identity' },
                  { id: 'attendance', icon: Clock, label: 'Work History' },
                  { id: 'compensation', icon: Wallet, label: 'Comp & Pay' },
                  { id: 'compliance', icon: ShieldCheck, label: 'Legal & Compliance' },
                  { id: 'performance', icon: TrendingUp, label: 'Growth Tracking' }
                ].map((t) => (
                  <TabsTrigger 
                    key={t.id}
                    value={t.id}
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 rounded-none h-full px-2 font-black uppercase italic tracking-widest text-[10px] text-slate-400 transition-all border-b-4 border-transparent gap-2"
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-8">
                  <TabsContent value="identity" className="mt-0 space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 gap-8">
                       <section className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Employment Details</h4>
                          <div className="space-y-3">
                             <DataRow label="Hire Date" value={employee.hireDate} />
                             <DataRow label="Workplace Node" value={employee.locationId} icon={MapPin} />
                             <DataRow label="Contract Type" value="Permanent Full-Time" />
                             <DataRow label="Reporting Line" value="Director of Operations" icon={Briefcase} />
                          </div>
                       </section>
                       <section className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2">Contact Intelligence</h4>
                          <div className="space-y-3">
                             <DataRow label="Enterprise Email" value={`${employee.id}@zenvix.corp`} />
                             <DataRow label="Internal Extension" value="EXT-442" />
                             <DataRow label="Emergency Node" value="Contact Registered" />
                          </div>
                       </section>
                    </div>
                  </TabsContent>

                  <TabsContent value="attendance" className="mt-0 space-y-6 animate-in fade-in duration-300">
                     <div className="rounded-2xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left">
                           <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                              <tr>
                                 <th className="p-4">Date</th>
                                 <th className="p-4">Shift</th>
                                 <th className="p-4">Clock In/Out</th>
                                 <th className="p-4">Status</th>
                              </tr>
                           </thead>
                           <tbody className="text-xs font-bold uppercase tracking-wider text-slate-700">
                              {(record?.attendance || []).map((entry: any) => (
                                <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50/30">
                                   <td className="p-4">{entry.date}</td>
                                   <td className="p-4">09:00 - 18:00</td>
                                   <td className="p-4">08:54 / 18:02</td>
                                   <td className="p-4">
                                      <Badge className="bg-emerald-100 text-emerald-700 border-transparent text-[9px] font-black uppercase">{entry.status}</Badge>
                                   </td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </TabsContent>

                  <TabsContent value="compensation" className="mt-0 space-y-6 animate-in fade-in duration-300">
                     <div className="grid grid-cols-3 gap-6">
                        <Card className="bg-slate-50 border-none shadow-none">
                           <CardContent className="p-6">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Salary</p>
                              <p className="text-2xl font-black text-slate-900">{formatCurrency(employee.baseSalary)}</p>
                           </CardContent>
                        </Card>
                        <Card className="bg-slate-50 border-none shadow-none">
                           <CardContent className="p-6">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hourly Rate</p>
                              <p className="text-2xl font-black text-slate-900">{formatCurrency(employee.hourlyRate)}</p>
                           </CardContent>
                        </Card>
                        <Card className="bg-slate-50 border-none shadow-none">
                           <CardContent className="p-6">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Code</p>
                              <p className="text-2xl font-black text-slate-900">TX-2024-A</p>
                           </CardContent>
                        </Card>
                     </div>
                  </TabsContent>

                  {/* Other tabs follow same premium pattern... */}
                  <TabsContent value="compliance" className="mt-0 pt-20 text-center text-slate-300">
                     <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                     <p className="text-xs font-black uppercase tracking-widest">Loading Legal Repository...</p>
                  </TabsContent>

                  <TabsContent value="performance" className="mt-0 pt-20 text-center text-slate-300">
                     <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
                     <p className="text-xs font-black uppercase tracking-widest">Calculating Growth Vectors...</p>
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DataRow = ({ label, value, icon: Icon }: { label: string, value: string, icon?: any }) => (
  <div className="flex items-center justify-between py-2">
     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
     <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3 h-3 text-slate-400" />}
        <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{value}</span>
     </div>
  </div>
);
