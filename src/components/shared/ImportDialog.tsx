import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/core/security/session";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/core/api/apiClient";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: string;
  title: string;
  onSuccess: (data: any) => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  endpoint,
  title,
  onSuccess,
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    message: string;
    count?: number;
    errors?: any[];
  } | null>(null);
  const session = useSession();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const data = await apiRequest<any>(endpoint, "POST", session, formData);
      setResults(data);

      if (data.success) {
        toast.success(data.message || "Import completed successfully");
        onSuccess(data.data);
      } else {
        toast.error("Import failed with errors");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to bulk import records.
          </DialogDescription>
        </DialogHeader>

        {results ? (
          <div className="space-y-4">
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${results.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
            >
              {results.success ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span className="font-medium">{results.message}</span>
            </div>

            {results.errors && results.errors.length > 0 && (
              <ScrollArea className="h-48 rounded border p-2">
                <div className="space-y-2">
                  {results.errors.map((err, i) => (
                    <div
                      key={i}
                      className="text-xs border-b pb-1 last:border-0 text-red-600"
                    >
                      <p className="font-semibold">Row {err.row}:</p>
                      {err.errors.map((e: any, j: number) => (
                        <p key={j} className="ml-2">
                          • {e.property}:{" "}
                          {Object.values(e.constraints).join(", ")}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setResults(null)}>
                Try Again
              </Button>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="file-upload">Select File (CSV, XLSX)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv, .xlsx"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <FileText className="h-4 w-4" /> {file.name}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={loading || !file}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {loading ? "Uploading..." : "Import Now"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
