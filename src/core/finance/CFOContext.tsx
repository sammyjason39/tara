import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSession } from "@/core/security/session";

export interface CFOState {
  companyId: string;
  periodId: string;
  snapshotSequence: number | null;
  filters: Record<string, string>;
  isLocked: boolean;
  correlationId: string;
}

interface CFOContextValue {
  state: CFOState;
  lockSequence: (sequence: number) => void;
  updateFilters: (updates: Partial<Omit<CFOState, "isLocked" | "snapshotSequence" | "correlationId">>) => void;
  resetContext: () => void;
}

const generateCorrelationId = () => 
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cfo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const CFOContext = createContext<CFOContextValue | undefined>(undefined);

export const CFOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const session = useSession();

  const [state, setState] = useState<CFOState>(() => {
    const urlCompanyId = searchParams.get("companyId");
    const urlPeriodId = searchParams.get("periodId");
    
    return {
      companyId: urlCompanyId || session.tenant_id || "",
      periodId: urlPeriodId || "",
      snapshotSequence: searchParams.get("sequence") ? parseInt(searchParams.get("sequence")!) : null,
      filters: {},
      isLocked: !!searchParams.get("sequence"),
      correlationId: generateCorrelationId(),
    };
  });

  const lockSequence = useCallback((sequence: number) => {
    setState((prev) => {
      if (prev.isLocked && prev.snapshotSequence !== sequence) {
        // Strict Integrity Violation: Trigger Refetch
        console.warn("Sequence mismatch detected. Forcing refetch.");
        return { ...prev, snapshotSequence: sequence, isLocked: true };
      }
      return { ...prev, snapshotSequence: sequence, isLocked: true };
    });
    
    setSearchParams((prev) => {
      prev.set("sequence", sequence.toString());
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const updateFilters = useCallback((updates: Partial<Omit<CFOState, "isLocked" | "snapshotSequence" | "correlationId">>) => {
    setState((prev) => ({
      ...prev,
      ...updates,
      snapshotSequence: null, // Reset sequence on filter change
      isLocked: false,
    }));

    setSearchParams((prev) => {
      if (updates.companyId) prev.set("companyId", updates.companyId);
      if (updates.periodId) prev.set("periodId", updates.periodId);
      prev.delete("sequence");
      return prev;
    });
  }, [setSearchParams]);

  const resetContext = useCallback(() => {
    setState({
      companyId: "",
      periodId: "",
      snapshotSequence: null,
      filters: {},
      isLocked: false,
      correlationId: generateCorrelationId(),
    });
    setSearchParams({});
  }, [setSearchParams]);

  // Sync URL to State if changed externally
  useEffect(() => {
    const urlCompanyId = searchParams.get("companyId") || "";
    const urlPeriodId = searchParams.get("periodId") || "";
    const urlSequence = searchParams.get("sequence") ? parseInt(searchParams.get("sequence")!) : null;

    if (urlCompanyId !== state.companyId || urlPeriodId !== state.periodId || urlSequence !== state.snapshotSequence) {
      setState(prev => ({
        ...prev,
        companyId: urlCompanyId || prev.companyId,
        periodId: urlPeriodId || prev.periodId,
        snapshotSequence: urlSequence,
        isLocked: !!urlSequence
      }));
    }
  }, [searchParams]);

  // Sync session to state if state is empty
  useEffect(() => {
    if (!state.companyId && session.tenant_id) {
      setState(prev => ({
        ...prev,
        companyId: session.tenant_id
      }));
    }
  }, [session.tenant_id, state.companyId]);

  return (
    <CFOContext.Provider value={{ state, lockSequence, updateFilters, resetContext }}>
      {children}
    </CFOContext.Provider>
  );
};

export const useCFO = () => {
  const context = useContext(CFOContext);
  if (!context) {
    throw new Error("useCFO must be used within a CFOProvider");
  }
  return context;
};
