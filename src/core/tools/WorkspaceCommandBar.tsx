import type React from "react";
import { Input } from "@/components/ui/input";

type WorkspaceCommandBarProps = {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
};

export function WorkspaceCommandBar({
  searchPlaceholder = "Search across this workspace...",
  searchValue,
  onSearchChange,
  actions,
}: WorkspaceCommandBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3">
      <div className="flex min-w-[220px] flex-1 items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export default WorkspaceCommandBar;
