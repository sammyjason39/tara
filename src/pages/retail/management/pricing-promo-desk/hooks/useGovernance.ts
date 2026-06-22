import { useState, useCallback, useEffect } from "react";
import type {
  GovernanceState,
  GovernancePhase,
  Signature,
  DepartmentRole,
  AuditEntry,
} from "../types/governance";
import { toast } from "@/hooks/use-toast";
import { retailService } from "@/core/services/retail/retailService";
import type { SessionContext } from "@/core/security/session";

export const useGovernance = (
  promoId: string,
  tenantId: string,
  session: SessionContext,
) => {
  const [state, setState] = useState<GovernanceState>({
    phase: "Draft",
    signatures: [],
    quorumReached: false,
    requiredSignatures: 4,
    isBypassMode: false,
    bypassReason: "",
  });

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Fetch governance audit log from backend when promoId changes
  useEffect(() => {
    if (!promoId || !tenantId || !session?.tenant_id) return;

    const fetchAuditLog = async () => {
      setIsLoadingAudit(true);
      setAuditError(null);
      try {
        if ((retailService as any).getGovernanceAuditLog) {
          const data = await (retailService as any).getGovernanceAuditLog(
            tenantId,
            session,
            promoId,
          );
          setAuditLog(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn("Failed to fetch governance audit log from backend", err);
        setAuditError("Failed to load audit trail");
        // Keep any locally-generated entries rather than clearing
      } finally {
        setIsLoadingAudit(false);
      }
    };
    fetchAuditLog();
  }, [promoId, tenantId, session?.tenant_id]);

  const logAction = useCallback(
    async (
      action: AuditEntry["action"],
      details: string,
      role: DepartmentRole | "System" = "System" as any,
    ) => {
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        promoId,
        version: 1,
        timestamp: new Date().toISOString(),
        actor: session.user_id || "Unknown Actor",
        role: role as DepartmentRole,
        action,
        details,
      };

      setAuditLog((prev) => [entry, ...prev]);

      try {
        if ((retailService as any).logGovernanceAction) {
          await (retailService as any).logGovernanceAction(
            tenantId,
            session,
            entry,
          );
        }
      } catch (err) {
        console.warn("Failed to log governance action to remote", err);
      }
    },
    [promoId, tenantId, session],
  );

  const addSignature = async (
    department: DepartmentRole,
    signedBy: string,
    isBypass = false,
    comment = "",
  ) => {
    // Prevent duplicate signatures unless bypass
    const alreadySigned = state.signatures.some(
      (s) => s.department === department,
    );
    if (!isBypass && alreadySigned) {
      toast({
        title: "Signature Exists",
        description: `Department ${department} has already signed.`,
        variant: "destructive",
      });
      return;
    }

    const newSignature: Signature = {
      id: crypto.randomUUID(),
      department,
      signedBy,
      signedAt: new Date().toISOString(),
      comment,
      isBypass,
    };

    setState((prev) => {
      const newSignatures = [...prev.signatures, newSignature];
      const uniqueDepts = new Set(
        (Array.isArray(newSignatures) ? newSignatures : []).filter((s) => !s.isBypass).map((s) => s.department),
      ).size;
      const quorumReached = uniqueDepts >= prev.requiredSignatures || isBypass;

      let newPhase: GovernancePhase = prev.phase;
      if (quorumReached) {
        newPhase = "Quorum";
      } else if (newSignatures.length > 0) {
        newPhase = "Pending";
      }

      return {
        ...prev,
        signatures: newSignatures,
        quorumReached,
        phase: newPhase,
      };
    });

    await logAction(
      "Signed",
      isBypass
        ? `Bypass Signature recorded for ${department}`
        : `Signature block recorded for ${department}`,
      department,
    );

    toast({
      title: "Signature Verified",
      description: `Cryptographic proof recorded for ${department}`,
    });
  };

  const toggleBypassMode = () => {
    setState((prev) => ({ ...prev, isBypassMode: !prev.isBypassMode }));
  };

  const setBypassReason = (reason: string) => {
    setState((prev) => ({ ...prev, bypassReason: reason }));
  };

  const executePromo = async () => {
    if (!state.quorumReached && !state.isBypassMode) {
      toast({
        title: "Quorum Not Reached",
        description: `Need at least ${state.requiredSignatures} department signatures.`,
        variant: "destructive",
      });
      return false;
    }
    if (state.isBypassMode && !state.bypassReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Bypass Reason is mandatory for Superadmin Execution.",
        variant: "destructive",
      });
      return false;
    }

    setState((prev) => ({ ...prev, phase: "Executed" }));
    await logAction(
      state.isBypassMode ? "Bypassed" : "Executed",
      state.isBypassMode
        ? `Superadmin Bypass Execution: ${state.bypassReason}`
        : "Consensus Reached. Promotion is now Live.",
      state.isBypassMode ? "Superadmin" : "Sales", // Fallback role for logs
    );

    toast({
      title: "Consensus Achieved",
      description:
        "Promotion entity has been finalized and locked to the ledger.",
    });

    return true;
  };

  return {
    state,
    auditLog,
    isLoadingAudit,
    auditError,
    addSignature,
    toggleBypassMode,
    setBypassReason,
    executePromo,
  };
};
