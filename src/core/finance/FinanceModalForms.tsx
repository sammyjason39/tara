/**
 * Finance Module Modal Forms
 *
 * Provides functional modal form components for all Finance domain entities,
 * replacing 42 stub modals with real forms using:
 * - ModuleModal (shared generic modal pattern)
 * - Zod schemas (client-side validation)
 * - TanStack Query mutations (API integration)
 * - Audit trail logging on successful submission
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 16.1
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { ModuleModal } from "@/components/shared/ModuleModal";
import { useModuleMutation } from "@/hooks/useModuleQuery";
import { useSession } from "@/core/security/session";
import { logService } from "@/core/services/finance/logService";
import {
  paymentSchema,
  receivableSchema,
  payableSchema,
  invoiceCaptureSchema,
  treasuryTransferSchema,
  policySchema,
  capexRequestSchema,
  registerAssetSchema,
  assetImpairmentSchema,
  assetRevaluationSchema,
  assetDisposalSchema,
  reconciliationSchema,
  capexBudgetSchema,
  documentUploadSchema,
  budgetLineSchema,
  settlementReconcileSchema,
  sourceLimitSchema,
  payslipConfigSchema,
  type PaymentFormData,
  type ReceivableFormData,
  type PayableFormData,
  type InvoiceCaptureFormData,
  type TreasuryTransferFormData,
  type PolicyFormData,
  type CapexRequestFormData,
} from "./schemas";

import type { RegisterAssetFormData } from "./schemas";
import type { AssetImpairmentFormData } from "./schemas";
import type { AssetRevaluationFormData } from "./schemas";
import type { AssetDisposalFormData } from "./schemas";
import type { ReconciliationFormData } from "./schemas";
import type { CapexBudgetFormData } from "./schemas";
import type { DocumentUploadFormData } from "./schemas";
import type { BudgetLineFormData } from "./schemas";
import type { SettlementReconcileFormData } from "./schemas";
import type { SourceLimitFormData } from "./schemas";
import type { PayslipConfigFormData } from "./schemas";

// ---------------------------------------------------------------------------
// Helper: audit trail on finance submission
// ---------------------------------------------------------------------------

function useAuditLog() {
  const session = useSession();
  return (action: string, details: string) => {
    logService.log(session.tenant_id, session.user_id, action, details);
  };
}

// ---------------------------------------------------------------------------
// Shared modal props interface
// ---------------------------------------------------------------------------

interface FinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}


// ===========================================================================
// 1. PAYMENT MODAL
// ===========================================================================

export function CreatePaymentModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<PaymentFormData, unknown>(
    "/v1/finance/payments",
    "POST",
    ["/v1/finance/payments"]
  );

  return (
    <ModuleModal
      schema={paymentSchema}
      defaultValues={{
        beneficiary: "",
        amount: 0,
        method: "BANK_TRANSFER",
        purpose: "",
        source: "",
        department: "",
        currency: "IDR",
        scheduledDate: "",
        extraInfo: "",
      }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Created Payment", `${data.beneficiary} - ${data.amount}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Create Payment"
      isOpen={isOpen}
      description="Initiate an outgoing payment transfer."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="beneficiary" render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient / Beneficiary</FormLabel>
              <FormControl><Input placeholder="Name or account" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="method" render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                <SelectContent>
                  {["BANK_TRANSFER","QRIS","GOPAY","OVO","DANA","SHOPEEPAY","CARD"].map(m => (
                    <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="purpose" render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose</FormLabel>
              <FormControl><Textarea placeholder="Payment purpose..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="scheduledDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled Date (optional)</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 2. RECEIVABLE MODAL
// ===========================================================================

export function CreateReceivableModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<ReceivableFormData, unknown>(
    "/v1/finance/receivables",
    "POST",
    ["/v1/finance/receivables"]
  );

  return (
    <ModuleModal
      schema={receivableSchema}
      defaultValues={{ customer: "", amount: 0, dueDate: "", invoiceDate: "", currency: "IDR" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Created Receivable", `${data.customer} - ${data.amount}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Create Receivable"
      isOpen={isOpen}
      description="Record a new accounts receivable invoice."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="customer" render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name</FormLabel>
              <FormControl><Input placeholder="Customer name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 3. PAYABLE MODAL
// ===========================================================================

export function CreatePayableModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<PayableFormData, unknown>(
    "/v1/finance/payables",
    "POST",
    ["/v1/finance/payables"]
  );

  return (
    <ModuleModal
      schema={payableSchema}
      defaultValues={{ vendor: "", amount: 0, dueDate: "", currency: "IDR" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Created Payable", `${data.vendor} - ${data.amount}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Create Payable"
      isOpen={isOpen}
      description="Record a new accounts payable bill."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="vendor" render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor Name</FormLabel>
              <FormControl><Input placeholder="Vendor name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 4. INVOICE CAPTURE MODAL
// ===========================================================================

export function InvoiceCaptureModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<InvoiceCaptureFormData, unknown>(
    "/v1/finance/payables",
    "POST",
    ["/v1/finance/payables", "/v1/finance/invoices"]
  );

  return (
    <ModuleModal
      schema={invoiceCaptureSchema}
      defaultValues={{ vendor: "", amount: 0, invoiceDate: "", dueDate: "" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Captured Invoice", `${data.vendor} - ${data.amount}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Capture Invoice"
      isOpen={isOpen}
      description="Record a supplier invoice for accounts payable."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="vendor" render={({ field }) => (
            <FormItem>
              <FormLabel>Vendor</FormLabel>
              <FormControl><Input placeholder="Vendor name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="invoiceDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Invoice Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 5. TREASURY TRANSFER MODAL
// ===========================================================================

interface TreasuryTransferModalProps extends FinanceModalProps {
  sources?: Array<{ id: string; name: string; currency: string }>;
}

export function TreasuryTransferModal({ isOpen, onClose, onSuccess, sources = [] }: TreasuryTransferModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<TreasuryTransferFormData, unknown>(
    "/v1/finance/treasury/transfers",
    "POST",
    ["/v1/finance/treasury/transfers", "/v1/finance/treasury/sources"]
  );

  return (
    <ModuleModal
      schema={treasuryTransferSchema}
      defaultValues={{ sourceId: "", destinationId: "", amount: 0, description: "" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Treasury Transfer", `${data.amount} from ${data.sourceId} to ${data.destinationId}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Treasury Transfer"
      isOpen={isOpen}
      description="Transfer funds between accounts."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="sourceId" render={({ field }) => (
            <FormItem>
              <FormLabel>From Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                <SelectContent>
                  {sources.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.currency})</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="destinationId" render={({ field }) => (
            <FormItem>
              <FormLabel>To Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger></FormControl>
                <SelectContent>
                  {sources.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.currency})</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Textarea placeholder="Transfer description..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 6. POLICY MODAL
// ===========================================================================

export function CreatePolicyModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<PolicyFormData, unknown>(
    "/v1/finance/policies",
    "POST",
    ["/v1/finance/policies"]
  );

  return (
    <ModuleModal
      schema={policySchema}
      defaultValues={{ title: "", type: "", description: "", threshold: 0 }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Created Policy", data.title);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Create Finance Policy"
      isOpen={isOpen}
      description="Define a new finance compliance policy."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Policy Title</FormLabel>
              <FormControl><Input placeholder="Policy title" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="APPROVAL">Approval</SelectItem>
                  <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                  <SelectItem value="AUDIT">Audit</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Textarea placeholder="Policy description..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="threshold" render={({ field }) => (
            <FormItem>
              <FormLabel>Threshold Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}

// ===========================================================================
// 7. CAPEX REQUEST MODAL
// ===========================================================================

export function CreateCapexRequestModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<CapexRequestFormData, unknown>(
    "/v1/finance/capex/requests",
    "POST",
    ["/v1/finance/capex/requests"]
  );

  return (
    <ModuleModal
      schema={capexRequestSchema}
      defaultValues={{
        assetDescription: "", requestedAmount: 0, department: "",
        projectCode: "", location: "", acquisitionDate: "",
        usefulLifeYears: 5, residualValue: 0,
        depreciationMethod: "STRAIGHT_LINE", assetClass: "EQUIPMENT",
      }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Created CAPEX Request", data.assetDescription);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Create CAPEX Request"
      isOpen={isOpen}
      description="Submit a capital expenditure request for approval."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="assetDescription" render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Description</FormLabel>
              <FormControl><Input placeholder="e.g., Server Equipment" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="requestedAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>Requested Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="department" render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <FormControl><Input placeholder="Department" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="assetClass" render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Class</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {["LAND","BUILDING","MACHINERY","VEHICLE","FURNITURE","EQUIPMENT","SOFTWARE","OTHER"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="depreciationMethod" render={({ field }) => (
            <FormItem>
              <FormLabel>Depreciation Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                  <SelectItem value="DECLINING_BALANCE">Declining Balance</SelectItem>
                  <SelectItem value="UNIT_OF_PRODUCTION">Unit of Production</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="usefulLifeYears" render={({ field }) => (
            <FormItem>
              <FormLabel>Useful Life (years)</FormLabel>
              <FormControl><Input type="number" placeholder="5" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 8. REGISTER ASSET MODAL
// ===========================================================================

export function RegisterAssetModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<RegisterAssetFormData, unknown>(
    "/v1/finance/assets",
    "POST",
    ["/v1/finance/assets"]
  );

  return (
    <ModuleModal
      schema={registerAssetSchema}
      defaultValues={{
        description: "", assetClass: "EQUIPMENT", location: "",
        department: "", acquisitionCost: 0,
        acquisitionDate: new Date().toISOString().slice(0, 10),
        usefulLifeYears: 5, residualValue: 0, depreciationMethod: "STRAIGHT_LINE",
      }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Registered Asset", data.description);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Register Fixed Asset"
      isOpen={isOpen}
      description="Register a new fixed asset in the asset register."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="Asset description" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="assetClass" render={({ field }) => (
            <FormItem>
              <FormLabel>Asset Class</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {["LAND","BUILDING","MACHINERY","VEHICLE","FURNITURE","EQUIPMENT","SOFTWARE","OTHER"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl><Input placeholder="Location" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="department" render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <FormControl><Input placeholder="Department" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="acquisitionCost" render={({ field }) => (
            <FormItem>
              <FormLabel>Acquisition Cost</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="acquisitionDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Acquisition Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="usefulLifeYears" render={({ field }) => (
            <FormItem>
              <FormLabel>Useful Life (years)</FormLabel>
              <FormControl><Input type="number" placeholder="5" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="depreciationMethod" render={({ field }) => (
            <FormItem>
              <FormLabel>Depreciation Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem>
                  <SelectItem value="DECLINING_BALANCE">Declining Balance</SelectItem>
                  <SelectItem value="UNIT_OF_PRODUCTION">Unit of Production</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 9. ASSET IMPAIRMENT MODAL
// ===========================================================================

interface AssetModalProps extends FinanceModalProps {
  assetId: string;
}

export function AssetImpairmentModal({ isOpen, onClose, onSuccess, assetId }: AssetModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<AssetImpairmentFormData, unknown>(
    `/v1/finance/assets/${assetId}/impairment`,
    "POST",
    ["/v1/finance/assets", "/v1/finance/assets/events"]
  );

  return (
    <ModuleModal
      schema={assetImpairmentSchema}
      defaultValues={{ assetId, impairmentAmount: 0, reason: "" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Recorded Impairment", `Asset ${assetId} - ${data.impairmentAmount}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Record Impairment"
      isOpen={isOpen}
      description="Record an impairment loss on this asset."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="impairmentAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>Impairment Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="reason" render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl><Textarea placeholder="Reason for impairment..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 10. ASSET REVALUATION MODAL
// ===========================================================================

export function AssetRevaluationModal({ isOpen, onClose, onSuccess, assetId }: AssetModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<AssetRevaluationFormData, unknown>(
    `/v1/finance/assets/${assetId}/revaluation`,
    "POST",
    ["/v1/finance/assets", "/v1/finance/assets/events"]
  );

  return (
    <ModuleModal
      schema={assetRevaluationSchema}
      defaultValues={{ assetId, revaluedAmount: 0, reason: "" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Recorded Revaluation", `Asset ${assetId} - ${data.revaluedAmount}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Record Revaluation"
      isOpen={isOpen}
      description="Revalue this asset to a new fair value."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="revaluedAmount" render={({ field }) => (
            <FormItem>
              <FormLabel>New Value</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="reason" render={({ field }) => (
            <FormItem>
              <FormLabel>Reason</FormLabel>
              <FormControl><Textarea placeholder="Reason for revaluation..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}

// ===========================================================================
// 11. ASSET DISPOSAL MODAL
// ===========================================================================

export function AssetDisposalModal({ isOpen, onClose, onSuccess, assetId }: AssetModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<AssetDisposalFormData, unknown>(
    `/v1/finance/assets/${assetId}/disposal`,
    "POST",
    ["/v1/finance/assets", "/v1/finance/assets/events"]
  );

  return (
    <ModuleModal
      schema={assetDisposalSchema}
      defaultValues={{ assetId, disposalType: "SALE", proceeds: 0 }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Disposed Asset", `Asset ${assetId} - ${data.disposalType}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Dispose Asset"
      isOpen={isOpen}
      description="Record asset disposal, sale, or write-off."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="disposalType" render={({ field }) => (
            <FormItem>
              <FormLabel>Disposal Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="SALE">Sale</SelectItem>
                  <SelectItem value="WRITE_OFF">Write Off</SelectItem>
                  <SelectItem value="RETIREMENT">Retirement</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="proceeds" render={({ field }) => (
            <FormItem>
              <FormLabel>Proceeds</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}

// ===========================================================================
// 12. RECONCILIATION MODAL
// ===========================================================================

export function ReconciliationModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<ReconciliationFormData, unknown>(
    "/v1/finance/reconciliation",
    "POST",
    ["/v1/finance/reconciliation"]
  );

  return (
    <ModuleModal
      schema={reconciliationSchema}
      defaultValues={{ accountId: "", periodStart: "", periodEnd: "", bankBalance: 0, bookBalance: 0, notes: "" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Reconciliation", `Account ${data.accountId}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Bank Reconciliation"
      isOpen={isOpen}
      description="Reconcile bank statement against book records."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="accountId" render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl><Input placeholder="Account ID" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="periodStart" render={({ field }) => (
            <FormItem>
              <FormLabel>Period Start</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="periodEnd" render={({ field }) => (
            <FormItem>
              <FormLabel>Period End</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bankBalance" render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Balance</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="bookBalance" render={({ field }) => (
            <FormItem>
              <FormLabel>Book Balance</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl><Textarea placeholder="Reconciliation notes..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 13. CAPEX BUDGET MODAL
// ===========================================================================

export function CapexBudgetModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<CapexBudgetFormData, unknown>(
    "/v1/finance/capex/budgets",
    "POST",
    ["/v1/finance/capex/budgets"]
  );

  return (
    <ModuleModal
      schema={capexBudgetSchema}
      defaultValues={{ department: "", totalBudget: 0, fiscalYear: new Date().getFullYear().toString() }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Set CAPEX Budget", `${data.department} - ${data.totalBudget}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Set CAPEX Budget"
      isOpen={isOpen}
      description="Define capital expenditure budget for a department."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="department" render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <FormControl><Input placeholder="Department" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="totalBudget" render={({ field }) => (
            <FormItem>
              <FormLabel>Total Budget</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="fiscalYear" render={({ field }) => (
            <FormItem>
              <FormLabel>Fiscal Year</FormLabel>
              <FormControl><Input placeholder="2024" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 14. DOCUMENT UPLOAD MODAL
// ===========================================================================

export function DocumentUploadModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<DocumentUploadFormData, unknown>(
    "/v1/finance/documents/upload",
    "POST",
    ["/v1/finance/documents"]
  );

  return (
    <ModuleModal
      schema={documentUploadSchema}
      defaultValues={{ title: "", type: "", description: "" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Uploaded Document", data.title);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Upload Document"
      isOpen={isOpen}
      description="Upload a finance document for approval."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Document Title</FormLabel>
              <FormControl><Input placeholder="Document title" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="INVOICE">Invoice</SelectItem>
                  <SelectItem value="RECEIPT">Receipt</SelectItem>
                  <SelectItem value="CONTRACT">Contract</SelectItem>
                  <SelectItem value="REPORT">Report</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl><Textarea placeholder="Description..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 15. BUDGET LINE MODAL
// ===========================================================================

export function BudgetLineModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<BudgetLineFormData, unknown>(
    "/v1/finance/budgets",
    "POST",
    ["/v1/finance/budgets"]
  );

  return (
    <ModuleModal
      schema={budgetLineSchema}
      defaultValues={{ category: "", description: "", amount: 0, period: "" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Created Budget Line", `${data.category} - ${data.amount}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Add Budget Line"
      isOpen={isOpen}
      description="Add a new line item to the budget plan."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl><Input placeholder="e.g., OPEX, CAPEX" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="Budget line description" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="period" render={({ field }) => (
            <FormItem>
              <FormLabel>Period</FormLabel>
              <FormControl><Input type="month" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 16. SETTLEMENT RECONCILE MODAL
// ===========================================================================

interface SettlementModalProps extends FinanceModalProps {
  sources?: Array<{ id: string; name: string; currency: string }>;
}

export function SettlementReconcileModal({ isOpen, onClose, onSuccess, sources = [] }: SettlementModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<SettlementReconcileFormData, unknown>(
    "/v1/finance/treasury/reconcile",
    "POST",
    ["/v1/finance/treasury/sources"]
  );

  return (
    <ModuleModal
      schema={settlementReconcileSchema}
      defaultValues={{ sourceId: "", amount: 0 }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Settlement Reconcile", `Source ${data.sourceId} - ${data.amount}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Reconcile Settlement"
      isOpen={isOpen}
      description="Reconcile a settlement amount for a money source."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="sourceId" render={({ field }) => (
            <FormItem>
              <FormLabel>Source Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger></FormControl>
                <SelectContent>
                  {sources.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.currency})</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}


// ===========================================================================
// 17. SOURCE LIMIT MODAL (Money Desk)
// ===========================================================================

export function SourceLimitModal({ isOpen, onClose, onSuccess, sourceId = "" }: FinanceModalProps & { sourceId?: string }) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<SourceLimitFormData, unknown>(
    "/v1/finance/treasury/sources/limits",
    "POST",
    ["/v1/finance/treasury/sources"]
  );

  return (
    <ModuleModal
      schema={sourceLimitSchema}
      defaultValues={{ sourceId, limitMin: 0, limitMax: 0 }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Updated Source Limits", `Source ${data.sourceId}`);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Set Account Limits"
      isOpen={isOpen}
      description="Configure minimum and maximum balance alerts."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="limitMin" render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Balance Alert</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="limitMax" render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Balance Alert</FormLabel>
              <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}

// ===========================================================================
// 18. PAYSLIP CONFIG MODAL
// ===========================================================================

export function PayslipConfigModal({ isOpen, onClose, onSuccess }: FinanceModalProps) {
  const auditLog = useAuditLog();
  const mutation = useModuleMutation<PayslipConfigFormData, unknown>(
    "/v1/finance/payslip/config",
    "POST",
    ["/v1/finance/payslip/config"]
  );

  return (
    <ModuleModal
      schema={payslipConfigSchema}
      defaultValues={{ templateName: "", companyName: "", logoUrl: "" }}
      onSubmit={async (data) => {
        await mutation.mutateAsync(data);
        auditLog("Updated Payslip Config", data.templateName);
        onClose();
        onSuccess?.();
      }}
      onCancel={onClose}
      title="Payslip Template Config"
      isOpen={isOpen}
      description="Configure payslip template settings."
    >
      {(form) => (
        <>
          <FormField control={form.control} name="templateName" render={({ field }) => (
            <FormItem>
              <FormLabel>Template Name</FormLabel>
              <FormControl><Input placeholder="Template name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="companyName" render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl><Input placeholder="Company name" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="logoUrl" render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL (optional)</FormLabel>
              <FormControl><Input placeholder="https://..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}
    </ModuleModal>
  );
}
