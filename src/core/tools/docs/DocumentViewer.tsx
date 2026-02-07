import { Button } from "@/components/ui/button";

type DocumentViewerProps = {
  title: string;
  content: string;
  onSave?: () => void;
  onPrint?: () => void;
};

export function DocumentViewer({ title, content, onSave, onPrint }: DocumentViewerProps) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onPrint}>
            Print
          </Button>
          <Button size="sm" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
        {content}
      </div>
    </div>
  );
}

export default DocumentViewer;
