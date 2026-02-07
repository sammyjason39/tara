import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activityService } from "./activityService";
import type { ActivityEntry } from "./activityTypes";

type ActivityThreadProps = {
  tenantId: string;
  entityType: string;
  entityId: string;
  actorId: string;
};

export function ActivityThread({
  tenantId,
  entityType,
  entityId,
  actorId,
}: ActivityThreadProps) {
  const [message, setMessage] = useState("");
  const [version, setVersion] = useState(0);

  const items = useMemo(
    () => activityService.list(tenantId, entityType, entityId),
    [tenantId, entityType, entityId, version],
  );

  const handleSend = () => {
    if (!message.trim()) return;
    activityService.add(tenantId, {
      entityType,
      entityId,
      actorId,
      message: message.trim(),
    });
    setMessage("");
    setVersion((prev) => prev + 1);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            No activity yet. Add the first comment.
          </div>
        ) : (
          items.map((entry: ActivityEntry) => (
            <div key={entry.id} className="rounded-lg border p-3 text-sm">
              <p className="text-xs text-muted-foreground">
                {entry.actorId} · {entry.createdAt.slice(0, 16).replace("T", " ")}
              </p>
              <p className="mt-2">{entry.message}</p>
            </div>
          ))
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Add a comment or @mention"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button onClick={handleSend}>Post</Button>
      </div>
    </div>
  );
}

export default ActivityThread;
