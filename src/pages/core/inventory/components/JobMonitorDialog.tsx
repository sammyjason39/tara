import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Clock,
  User,
  FileText,
  StopCircle,
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";
import { useDeleteImportJob } from "../hooks/useInventoryQueries";
import { format } from "date-fns";

interface Job {
  id: string;
  type: string;
  filename: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ABORTED';
  total_items: number;
  processed_items: number;
  error_count: number;
  errors: any[];
  started_at: string;
  completed_at: string;
  created_at: string;
  user_id: string;
}

interface JobMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobMonitorDialog({ open, onOpenChange }: JobMonitorDialogProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const session = useSession();
  const deleteJobMutation = useDeleteImportJob();

  const fetchJobs = async () => {
    try {
      const response = await apiRequest<Job[]>("/inventory/import/jobs", "GET", session);
      setJobs(response);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchJobs();
      const interval = setInterval(fetchJobs, 3000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const handleAbort = async (jobId: string) => {
    try {
      await deleteJobMutation.mutateAsync(jobId);
      fetchJobs();
    } catch (error) {
      // Error handled by mutation onError
    }
  };

  const getStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-success text-success border-success/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-primary text-primary border-primary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'FAILED':
        return <Badge className="bg-destructive text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'ABORTED':
        return <Badge className="bg-warning text-warning border-warning/20"><StopCircle className="w-3 h-3 mr-1" /> Aborted</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-muted border-border">
        <DialogHeader className="p-6 border-b border-border">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <Activity className="w-5 h-5 text-primary" />
            Background Task Monitor
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {!Array.isArray(jobs) || jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No recent background tasks found</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="p-4 rounded-xl bg-muted border border-border space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white max-w-[300px] truncate">
                          {job.filename}
                        </span>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {job.created_at && !isNaN(new Date(job.created_at).getTime()) 
                            ? format(new Date(job.created_at), "MMM d, HH:mm:ss") 
                            : "Pending..."}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {job.user_id}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] uppercase h-4 px-1">
                            {job.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {(job.status === 'PROCESSING' || job.status === 'PENDING') && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-8 text-xs gap-2"
                        onClick={() => handleAbort(job.id)}
                      >
                        <StopCircle className="w-3 h-3" />
                        Abort
                      </Button>
                    )}
                  </div>

                  {job.status === 'PROCESSING' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Progress: {Math.round((job.processed_items / (job.total_items || 1)) * 100)}%</span>
                        <span>{job.processed_items} / {job.total_items || '?'} items</span>
                      </div>
                      <Progress 
                        value={(job.processed_items / (job.total_items || 1)) * 100} 
                        className="h-1.5 bg-muted"
                      />
                    </div>
                  )}

                  {(job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'ABORTED') && (
                    <div className="grid grid-cols-3 gap-2 py-1">
                      <div className="px-2 py-1.5 rounded-lg bg-muted border border-border/50">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</div>
                        <div className="text-sm font-semibold text-white">{job.total_items}</div>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-muted border border-border/50">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Success</div>
                        <div className="text-sm font-semibold text-success">{job.processed_items}</div>
                      </div>
                      <div className="px-2 py-1.5 rounded-lg bg-muted border border-border/50">
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Errors</div>
                        <div className="text-sm font-semibold text-destructive">{job.error_count}</div>
                      </div>
                    </div>
                  )}

                  {job.errors && job.errors.length > 0 && (
                    <div className="p-3 rounded-lg bg-destructive border border-destructive/10 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-destructive">
                        <AlertCircle className="w-3 h-3" />
                        LATEST ERRORS
                      </div>
                      <div className="space-y-1">
                        {job.errors.slice(-2).map((err, idx) => (
                          <div key={idx} className="text-[10px] text-destructive font-mono truncate">
                            {err.identifier ? `[${err.identifier}] ` : ''}{err.message}
                          </div>
                        ))}
                        {job.errors.length > 2 && (
                          <div className="text-[9px] text-destructive italic">
                            + {job.errors.length - 2} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
