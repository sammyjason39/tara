import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedbackAlertProps {
  message: string | null;
  error: string | null;
  onClear: () => void;
}

/**
 * Reusable component for displaying success and error feedback at the top of pages.
 */
export function FeedbackAlert({ message, error, onClear }: FeedbackAlertProps) {
  if (!message && !error) return null;

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
      {message && (
        <Alert className="border-emerald-500/50 bg-emerald-500/5 text-emerald-600 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 !text-emerald-600 dark:!text-emerald-400" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{message}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-2 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-2 text-destructive hover:bg-destructive/10"
              onClick={onClear}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
