import { useEffect } from "react";

export function useBackgroundRefresh(onTick: () => void, intervalMs = 15000) {
  useEffect(() => {
    const id = window.setInterval(() => onTick(), intervalMs);
    return () => window.clearInterval(id);
  }, [onTick, intervalMs]);
}
