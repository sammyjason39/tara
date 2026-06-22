/**
 * Procurement Module — TanStack Query Hooks
 *
 * Provides reactive data fetching and mutations with automatic cache invalidation
 * for all procurement operations. Replaces direct procurementService calls with
 * TanStack Query patterns for proper loading/error state management.
 *
 * Requirements: 3.1, 3.2, 3.5, 9.1, 16.1, 17.2
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import type {
  ContractRecord,
  DraftPurchaseOrder,
  FinalPurchaseOrder,
  Requisition,
  SupplierBranch,
  SupplierMaster,
  SupplierPortalMessage,
  RiskSignal,
  ProcurementAuditEvent,
} from "@/core/types/procurement/procurement";
import type {
  DraftPurchaseOrderFormValues,
  GoodsReceiptFormValues,
  SupplierMasterFormValues,
  SupplierBranchFormValues,
  RequisitionFormValues,
  ContractPacketFormValues,
  SupplierQuoteFormValues,
  PortalMessageFormValues,
  CategoryFormValues,
} from "./schemas";

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const PROCUREMENT_KEYS = {
  suppliers: ["procurement", "suppliers"] as const,
  branches: ["procurement", "branches"] as const,
  requisitions: ["procurement", "requisitions"] as const,
  draftPos: ["procurement", "draft-pos"] as const,
  finalPos: ["procurement", "purchase-orders"] as const,
  contracts: ["procurement", "contracts"] as const,
  portalMessages: ["procurement", "portal-messages"] as const,
  riskSignals: ["procurement", "risk-signals"] as const,
  auditEvents: ["procurement", "audit-events"] as const,
  categories: ["procurement", "categories"] as const,
  overview: ["procurement", "overview"] as const,
  recommendations: (branchCode: string, category: string) =>
    ["procurement", "recommendations", branchCode, category] as const,
  spendInsights: ["procurement", "spend-insights"] as const,
};

// ─── List Queries ──────────────────────────────────────────────────────────────

export function useSupplierMasters() {
  const session = useSession();
  return useQuery<SupplierMaster[]>({
    queryKey: PROCUREMENT_KEYS.suppliers,
    queryFn: () => procurementService.listSupplierMasters(session.tenant_id, session),
    staleTime: 30_000,
  });
}

export function useSupplierBranches() {
  const session = useSession();
  return useQuery<SupplierBranch[]>({
    queryKey: PROCUREMENT_KEYS.branches,
    queryFn: () => procurementService.listSupplierBranches(session.tenant_id, session),
    staleTime: 30_000,
  });
}

export function useRequisitions() {
  const session = useSession();
  return useQuery<Requisition[]>({
    queryKey: PROCUREMENT_KEYS.requisitions,
    queryFn: () => procurementService.listRequisitions(session.tenant_id, session),
    staleTime: 30_000,
  });
}

export function useDraftPurchaseOrders() {
  const session = useSession();
  return useQuery<DraftPurchaseOrder[]>({
    queryKey: PROCUREMENT_KEYS.draftPos,
    queryFn: () => procurementService.listDraftPurchaseOrders(session.tenant_id, session),
    staleTime: 30_000,
  });
}

export function useFinalPurchaseOrders() {
  const session = useSession();
  return useQuery<FinalPurchaseOrder[]>({
    queryKey: PROCUREMENT_KEYS.finalPos,
    queryFn: () => procurementService.listFinalPurchaseOrders(session.tenant_id, session),
    staleTime: 30_000,
  });
}

export function useContracts() {
  const session = useSession();
  return useQuery<ContractRecord[]>({
    queryKey: PROCUREMENT_KEYS.contracts,
    queryFn: () => procurementService.listContracts(session.tenant_id, session),
    staleTime: 30_000,
  });
}

export function usePortalMessages() {
  const session = useSession();
  return useQuery<SupplierPortalMessage[]>({
    queryKey: PROCUREMENT_KEYS.portalMessages,
    queryFn: () => procurementService.listPortalMessages(session.tenant_id, session),
    staleTime: 30_000,
  });
}

export function useCategories() {
  const session = useSession();
  return useQuery<any[]>({
    queryKey: PROCUREMENT_KEYS.categories,
    queryFn: () => procurementService.listCategories(session.tenant_id, session),
    staleTime: 30_000,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateSupplierMaster() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SupplierMasterFormValues) =>
      procurementService.createSupplierMaster(session.tenant_id, session, {
        name: data.name,
        taxId: data.taxId,
        categories: data.categories.split(",").map((c) => c.trim()).filter(Boolean),
        branchCode: "HQ",
        website: data.website || undefined,
        contactPerson: data.contactPerson || undefined,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
        address: data.address || undefined,
        fullAddress: data.address || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.suppliers });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.branches });
    },
  });
}

export function useCreateSupplierBranch() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SupplierBranchFormValues) =>
      procurementService.createSupplierBranch(session.tenant_id, session, {
        supplierId: data.supplierId,
        branchCode: data.branchCode,
        branchName: data.branchName || `${data.branchCode} Branch`,
        location: data.location,
        leadTimeDays: data.leadTimeDays,
        fullAddress: data.fullAddress || undefined,
        contactPerson: data.contactPerson || undefined,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.branches });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.suppliers });
    },
  });
}

export function useCreateRequisition() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RequisitionFormValues) =>
      procurementService.createRequisition(session.tenant_id, session, {
        title: data.title,
        description: data.description,
        category: data.category,
        branchCode: data.branchCode,
        budgetClass: data.budgetClass,
        amount: data.amount,
        contractRequired: data.contractRequired,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.overview });
    },
  });
}

export function useBuildDraftPo() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DraftPurchaseOrderFormValues) =>
      procurementService.buildDraftPurchaseOrder(session.tenant_id, session, {
        requisitionId: data.requisitionId,
        supplierId: data.supplierId,
        supplierBranchId: data.supplierBranchId,
        contractType: data.contractType,
        lineItems: data.lineItems,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.draftPos });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function useConfirmSupplierQuote() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SupplierQuoteFormValues) =>
      procurementService.confirmSupplierQuote(session.tenant_id, session, {
        draftPoId: data.draftPoId,
        quoteReference: data.quoteReference,
        quoteNotes: data.quoteNotes || "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.draftPos });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function useUpsertContract() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContractPacketFormValues) =>
      procurementService.upsertContractForRequisition(session.tenant_id, session, {
        requisitionId: data.requisitionId,
        supplierId: data.supplierId,
        notes: data.notes || undefined,
        attachmentIds: data.attachmentIds || [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.contracts });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function useCreatePortalMessage() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PortalMessageFormValues) =>
      procurementService.createPortalMessage(session.tenant_id, session, {
        supplierId: data.supplierId,
        supplierBranchId: data.supplierBranchId,
        direction: data.direction,
        type: data.type,
        content: data.content,
        attachmentName: data.attachmentName || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.portalMessages });
    },
  });
}

export function useUpsertCategory() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryFormValues) =>
      procurementService.upsertCategory(session.tenant_id, session, {
        name: data.name,
        description: data.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.categories });
    },
  });
}

export function useDeleteCategory() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      procurementService.deleteCategory(session.tenant_id, session, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.categories });
    },
  });
}

export function useApproveRequesterHod() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requisitionId: string) =>
      procurementService.approveRequesterHod(session.tenant_id, session, requisitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function useApproveDraftPo() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftPoId: string) =>
      procurementService.approveDraftByProcurementHod(session.tenant_id, session, draftPoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.draftPos });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function useReleasePurchaseOrder() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requisitionId: string) =>
      procurementService.releasePurchaseOrder(session.tenant_id, session, requisitionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.finalPos });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.draftPos });
    },
  });
}

export function useRecordReceipt() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GoodsReceiptFormValues) =>
      procurementService.recordReceipt(session.tenant_id, session, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.finalPos });
    },
  });
}

export function useSetFinalApproval() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { requisitionId: string; approver: "REQUESTER_HOD" | "PROCUREMENT_HOD" | "FINANCE_HOD" }) =>
      procurementService.setFinalApproval(session.tenant_id, session, params.requisitionId, params.approver),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function useApproveLegalContract() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: string) =>
      procurementService.approveLegalContract(session.tenant_id, session, contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.contracts });
    },
  });
}

export function useSignContract() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { contractId: string; party: "SUPPLIER" | "PROCUREMENT_HOD" | "FINANCE_HOD" }) =>
      procurementService.signContractParty(session.tenant_id, session, params.contractId, params.party),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.contracts });
    },
  });
}

export function useRunRiskScan() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      procurementService.runRiskScan(session.tenant_id, session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.riskSignals });
    },
  });
}

export function useSetRiskSignalStatus() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { riskSignalId: string; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" }) =>
      procurementService.setRiskSignalStatus(session.tenant_id, session, params.riskSignalId, params.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.riskSignals });
    },
  });
}
