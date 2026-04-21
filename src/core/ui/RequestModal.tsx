import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; reason: string }) => Promise<void>;
  title: string;
  description: string;
  placeholder?: string;
  defaultTitle?: string;
}

export function RequestModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title, 
  description,
  placeholder = "Please explain the business reason for this request...",
  defaultTitle = ""
}: RequestModalProps) {
  const [reason, setReason] = useState("");
  const [requestTitle, setRequestTitle] = useState(defaultTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || !requestTitle.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({ title: requestTitle, reason });
      setReason("");
      onClose();
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Subject</Label>
            <Input 
              id="title" 
              value={requestTitle} 
              onChange={(e) => setRequestTitle(e.target.value)}
              placeholder="E.g., Access to Finance Module"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Business Justification</Label>
            <Textarea
              id="reason"
              placeholder={placeholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !reason.trim() || !requestTitle.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
