import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Loader2,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileArchive,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/core/security/session";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/core/api/apiClient";
import { Progress } from "@/components/ui/progress";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  title: string;
  onSuccess: (data: any) => void;
  type?: "DATA" | "IMAGES";
}

export function ImportDialog({
  open,
  onOpenChange,
  endpoint,
  title,
  onSuccess,
  type = "DATA",
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const session = useSession();

  useEffect(() => {
    let interval: any;
    if (jobId && open) {
      interval = setInterval(async () => {
        try {
          const data = await apiRequest<any>(
            `inventory/import/status/${jobId}`,
            "GET",
            session
          );
          setStatus(data);
          if (data.status === "COMPLETED" || data.status === "FAILED") {
            clearInterval(interval);
            if (data.status === "COMPLETED") {
              toast.success("Import completed successfully");
              onSuccess(data);
            } else {
              toast.error("Import failed");
            }
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, open, session]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus(null);
    setJobId(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiRequest<any>(endpoint, "POST", session, formData);
      if (data.success && data.jobId) {
        setJobId(data.jobId);
        toast.info("Import job started in background");
      } else if (data.success) {
        // Fallback for non-async endpoints
        toast.success(data.message || "Import completed");
        onSuccess(data.data);
        onOpenChange(false);
      } else {
        toast.error(data.message || "Import initiation failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = status && (status.status === "PENDING" || status.status === "PROCESSING");
  const isCompleted = status && status.status === "COMPLETED";
  const isFailed = status && status.status === "FAILED";

  const progress = status?.total_items > 0 
    ? Math.round((status.processed_items / status.total_items) * 100) 
    : isProcessing ? 10 : 0;

  return (
    <Dialog 
      open={open} 
      onOpenChange={(val) => {
        // Prevent closing while processing unless user specifically clicks a close button we provide
        if (isProcessing) return;
        onOpenChange(val);
      }}
    >
      <DialogContent 
        className="sm:max-w-[500px] border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white/95 backdrop-blur-xl"
        onPointerDownOutside={(e) => isProcessing && e.preventDefault()}
        onEscapeKeyDown={(e) => isProcessing && e.preventDefault()}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {jobId 
              ? `Job ID: ${jobId.slice(0, 8)}...`
              : type === "IMAGES" 
                ? "Upload a ZIP archive containing product images (SKU_*.jpg)." 
                : "Upload a CSV or Excel file to bulk import inventory."}
          </DialogDescription>
        </DialogHeader>

        {jobId ? (
          <div className="space-y-6 py-6 px-2">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              {isProcessing && (
                <div className="w-full space-y-4">
                  <div className="relative h-20 w-20 mx-auto">
                    <Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{progress}%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-slate-800">
                      {status.status === "PENDING" ? "Queueing Job..." : "Importing Data..."}
                    </p>
                    <p className="text-sm text-slate-500 font-medium">
                      Processed <span className="text-primary">{status.processed_items}</span> of <span className="text-slate-800 font-bold">{status.total_items || "?"}</span> records
                    </p>
                  </div>
                  
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-slate-400 italic">
                    This may take a few minutes for very large files. You can minimize this and it will continue in the background.
                  </p>
                </div>
              )}

              {isCompleted && (
                <div className="w-full space-y-4 py-4">
                  <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mx-auto border-4 border-green-100">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-slate-900">Success!</p>
                    <p className="text-slate-500 font-medium">
                      Imported {status.processed_items} items successfully.
                    </p>
                  </div>
                </div>
              )}

              {isFailed && (
                <div className="w-full space-y-4 py-4">
                  <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center mx-auto border-4 border-red-100">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold text-red-600">Import Failed</p>
                    <p className="text-slate-500 font-medium">
                      The process encountered a critical error.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {status?.errors && status.errors.length > 0 && (
              <div className="rounded-2xl border bg-red-50/50 p-4">
                <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Error Log
                </p>
                <ScrollArea className="h-32 pr-4">
                  <div className="space-y-2">
                    {status.errors.map((err: any, i: number) => (
                      <div key={i} className="text-xs bg-white/80 p-2 rounded-lg border border-red-100 shadow-sm text-red-600 font-mono">
                        {err.message || JSON.stringify(err)}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            <DialogFooter className="gap-2 pt-4 border-t">
              {isProcessing ? (
                <Button 
                  className="w-full rounded-xl py-6 font-bold shadow-lg"
                  onClick={() => onOpenChange(false)}
                >
                  Continue in Background
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="flex-1 rounded-xl py-6"
                    onClick={() => {
                      setJobId(null);
                      setStatus(null);
                      setFile(null);
                    }}
                  >
                    Start New
                  </Button>
                  <Button 
                    className="flex-1 rounded-xl py-6 font-bold shadow-lg"
                    onClick={() => onOpenChange(false)}
                  >
                    Finish
                  </Button>
                </>
              )}
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-6 py-6">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-700 ml-1">
                Payload Source
              </Label>
              <div 
                className="group border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-slate-50 transition-all cursor-pointer relative"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <div className="h-20 w-20 rounded-3xl bg-slate-50 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  {file ? (
                    type === "IMAGES" ? <FileArchive className="h-10 w-10 text-blue-500" /> : <FileText className="h-10 w-10 text-primary" />
                  ) : (
                    <Upload className="h-10 w-10 text-slate-400 group-hover:text-primary" />
                  )}
                </div>
                
                <div className="text-center">
                  {file ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">{file.name}</p>
                      <p className="text-xs font-medium text-slate-500">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to sync
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700">Drop your file here</p>
                      <p className="text-xs text-slate-400">
                        {type === "IMAGES" ? "ZIP archive only" : "CSV or XLSX format"}
                      </p>
                    </div>
                  )}
                </div>
                
                <Input
                  id="file-upload"
                  type="file"
                  accept={type === "IMAGES" ? ".zip" : ".csv, .xlsx"}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button 
                variant="ghost" 
                className="rounded-xl px-8" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                className="rounded-xl px-10 font-bold shadow-lg shadow-primary/20 h-12"
                onClick={handleUpload} 
                disabled={loading || !file}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-5 w-5" />
                )}
                {loading ? "Preparing..." : "Begin Migration"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
