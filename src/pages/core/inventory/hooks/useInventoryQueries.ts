/**
 * TanStack Query hooks for the Inventory module.
 *
 * Provides mutation hooks for all 14 inventory modal operations,
 * plus query hooks for movements, balances, and images.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 10.1–10.8, 16.1
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/core/api/apiClient";
import { useSession } from "@/core/security/session";
import { inventoryService } from "@/core/services/inventory/inventoryService";
import { toast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const INVENTORY_KEYS = {
  items: "/v1/inventory/items",
  balances: "/v1/inventory/balances",
  movements: "/v1/inventory/movements",
  adjustments: "/v1/inventory/adjustments",
  transfers: "/v1/inventory/stock-transfers",
  importJobs: "/v1/inventory/import/jobs",
  auditCycles: "/v1/inventory/audit-cycles",
  dashboard: "/v1/inventory/dashboard",
  categories: "/v1/inventory/categories",
  alerts: "/v1/inventory/alerts",
  images: (itemId: string) => `/v1/inventory/items/${itemId}/images`,
} as const;

// ---------------------------------------------------------------------------
// Mutation: Create Item
// ---------------------------------------------------------------------------

export function useCreateItem() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, any>({
    mutationFn: (data) =>
      inventoryService.createItem(session.tenant_id, session, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.items] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.dashboard] });
      toast({ title: "Item Created", description: "New inventory item has been added." });
    },
    onError: (error) => {
      toast({ title: "Creation Failed", description: error.message || "Failed to create item.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Update Item (PATCH)
// ---------------------------------------------------------------------------

export function useUpdateItem(itemId: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, any>({
    mutationFn: (data) =>
      inventoryService.updateItem(session.tenant_id, session, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.items] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.dashboard] });
      toast({ title: "Item Updated", description: "Item details have been saved." });
    },
    onError: (error) => {
      toast({ title: "Update Failed", description: error.message || "Failed to update item.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Delete Item (soft-delete)
// ---------------------------------------------------------------------------

export function useDeleteItem() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, string>({
    mutationFn: (itemId) =>
      inventoryService.deleteItem(session.tenant_id, session, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.items] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.dashboard] });
      toast({ title: "Item Archived", description: "Item has been soft-deleted." });
    },
    onError: (error) => {
      toast({ title: "Delete Failed", description: error.message || "Failed to archive item.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Stock Adjustment
// ---------------------------------------------------------------------------

export function useStockAdjustment() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, any>({
    mutationFn: (data) =>
      inventoryService.requestAdjustment(session.tenant_id, session, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.balances] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.adjustments] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.movements] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.dashboard] });
      toast({ title: "Adjustment Submitted", description: "Stock adjustment request recorded." });
    },
    onError: (error) => {
      toast({ title: "Adjustment Failed", description: error.message || "Failed to submit adjustment.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Transfer Stock
// ---------------------------------------------------------------------------

export function useCreateTransfer() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, any>({
    mutationFn: (data) =>
      inventoryService.createStockTransfer(session.tenant_id, session, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.transfers] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.balances] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.movements] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.dashboard] });
      toast({ title: "Transfer Initiated", description: "Stock transfer has been created." });
    },
    onError: (error) => {
      toast({ title: "Transfer Failed", description: error.message || "Failed to create transfer.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Record Transfer (single-item direct)
// ---------------------------------------------------------------------------

export function useRecordTransfer() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, any>({
    mutationFn: (data) =>
      inventoryService.recordTransfer(session.tenant_id, session, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.transfers] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.balances] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.movements] });
      toast({ title: "Transfer Complete", description: "Stock has been transferred." });
    },
    onError: (error) => {
      toast({ title: "Transfer Failed", description: error.message || "Failed to transfer stock.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Batch Intake
// ---------------------------------------------------------------------------

export function useBatchIntake() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, any[]>({
    mutationFn: (items) =>
      inventoryService.batchRecordIntake(session.tenant_id, session, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.items] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.balances] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.movements] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.dashboard] });
      toast({ title: "Batch Intake Complete", description: "Stock has been added." });
    },
    onError: (error) => {
      toast({ title: "Batch Intake Failed", description: error.message || "Failed to process batch intake.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Batch Transfer
// ---------------------------------------------------------------------------

export function useBatchTransfer() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, { transfers: any[] }>({
    mutationFn: ({ transfers }) =>
      Promise.all(
        transfers.map((t) =>
          inventoryService.recordTransfer(session.tenant_id, session, t)
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.transfers] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.balances] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.movements] });
      toast({ title: "Batch Transfer Complete", description: "All items transferred." });
    },
    onError: (error) => {
      toast({ title: "Batch Transfer Failed", description: error.message || "Failed to process batch transfer.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Approve Adjustment
// ---------------------------------------------------------------------------

export function useApproveAdjustment() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, string>({
    mutationFn: (adjustmentId) =>
      inventoryService.approveAdjustment(session.tenant_id, session, adjustmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.adjustments] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.balances] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.dashboard] });
      toast({ title: "Adjustment Approved", description: "Stock adjustment has been approved." });
    },
    onError: (error) => {
      toast({ title: "Approval Failed", description: error.message || "Failed to approve adjustment.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Start Audit Cycle
// ---------------------------------------------------------------------------

export function useStartAuditCycle() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, any>({
    mutationFn: (data) =>
      inventoryService.startAuditCycle(session.tenant_id, session, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.auditCycles] });
      toast({ title: "Audit Started", description: "New audit cycle has been initiated." });
    },
    onError: (error) => {
      toast({ title: "Audit Failed", description: error.message || "Failed to start audit cycle.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Delete Import Job
// ---------------------------------------------------------------------------

export function useDeleteImportJob() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, string>({
    mutationFn: (jobId) =>
      apiRequest<any>(`/inventory/import/jobs/${jobId}`, "DELETE", session),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.importJobs] });
      toast({ title: "Job Aborted", description: "Import job has been cancelled." });
    },
    onError: (error) => {
      toast({ title: "Abort Failed", description: error.message || "Failed to abort job.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Upload Image
// ---------------------------------------------------------------------------

export function useUploadImage(itemId: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, Error, File>({
    mutationFn: (file) =>
      inventoryService.uploadItemImage(session.tenant_id, session, itemId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.images(itemId)] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.items] });
      toast({ title: "Image Uploaded", description: "Image has been added to the item." });
    },
    onError: (error) => {
      toast({ title: "Upload Failed", description: error.message || "Failed to upload image.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Set Primary Image
// ---------------------------------------------------------------------------

export function useSetPrimaryImage(itemId: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, string>({
    mutationFn: (imageId) =>
      inventoryService.setPrimaryItemImage(session.tenant_id, session, itemId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.images(itemId)] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.items] });
      toast({ title: "Primary Updated", description: "Primary image has been set." });
    },
    onError: (error) => {
      toast({ title: "Failed", description: error.message || "Failed to set primary image.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Delete Image
// ---------------------------------------------------------------------------

export function useDeleteImage(itemId: string) {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, string>({
    mutationFn: (imageId) =>
      inventoryService.deleteItemImage(session.tenant_id, session, itemId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.images(itemId)] });
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.items] });
      toast({ title: "Image Removed", description: "Image has been deleted." });
    },
    onError: (error) => {
      toast({ title: "Delete Failed", description: error.message || "Failed to delete image.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutation: Ship Transfer (courier dispatch)
// ---------------------------------------------------------------------------

export function useShipTransfer() {
  const session = useSession();
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, { transferId: string; trackingNumber: string }>({
    mutationFn: ({ transferId, trackingNumber }) =>
      inventoryService.shipStockTransfer(session.tenant_id, session, transferId, trackingNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVENTORY_KEYS.transfers] });
      toast({ title: "Shipped", description: "Transfer has been dispatched." });
    },
    onError: (error) => {
      toast({ title: "Ship Failed", description: error.message || "Failed to mark as shipped.", variant: "destructive" });
    },
  });
}

// ---------------------------------------------------------------------------
// Query: Item Movements
// ---------------------------------------------------------------------------

export function useItemMovements(itemId: string | undefined) {
  const session = useSession();

  return useQuery({
    queryKey: [INVENTORY_KEYS.movements, itemId],
    queryFn: () => inventoryService.listMovements(session.tenant_id, session, itemId),
    enabled: !!itemId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Query: Item Balances
// ---------------------------------------------------------------------------

export function useItemBalances(itemId: string | undefined) {
  const session = useSession();

  return useQuery({
    queryKey: [INVENTORY_KEYS.balances, itemId],
    queryFn: () =>
      inventoryService.listBalances(session.tenant_id, session, undefined, undefined, 1, 100),
    enabled: !!itemId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Query: Item Images
// ---------------------------------------------------------------------------

export function useItemImages(itemId: string | undefined) {
  const session = useSession();

  return useQuery({
    queryKey: [INVENTORY_KEYS.images(itemId || "")],
    queryFn: () => inventoryService.listItemImages(session.tenant_id, session, itemId!),
    enabled: !!itemId,
    staleTime: 30_000,
  });
}

// ---------------------------------------------------------------------------
// Query: Inventory Items (for summary/stub element replacement)
// ---------------------------------------------------------------------------

export function useInventoryItems(options?: {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
}) {
  const session = useSession();

  return useQuery({
    queryKey: [INVENTORY_KEYS.items, options],
    queryFn: () =>
      inventoryService.listItems(
        session.tenant_id,
        session,
        undefined,
        options?.page || 1,
        options?.limit || 10,
        options?.search,
        options?.category_id
      ),
    staleTime: 30_000,
  });
}
