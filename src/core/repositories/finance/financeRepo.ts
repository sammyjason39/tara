import { prisma } from "@/core/persistence/database/client";
import type { FinanceRepository, Asset } from "./financeRepository";
import type { MoneySource } from "@/core/types/finance/accounts";
import type { JournalEntry } from "@/core/types/finance/ledger";
import type { PayableBill } from "@/core/types/finance/payables";
import type { ReceivableInvoice } from "@/core/types/finance/receivables";
import type { AssetDepreciationEntry, AssetEvent, CapexRequest } from "@/core/types/finance/assets";
import type { SettlementRecord, TreasuryTransfer } from "@/core/types/finance/treasury";

// --- Mappers ---
const mapMoneySource = (db: any): MoneySource => ({
  id: db.id,
  tenantId: db.tenantId,
  name: db.name,
  type: db.type as any,
  currency: db.currency as any,
  balance: db.balance.toNumber(),
  pendingSettlement: db.pendingSettlement.toNumber(),
  provider: db.provider || undefined,
  lastUpdated: db.lastUpdated.toISOString(),
});

// ... (Other mappers will be implemented inline or separately for brevity)

export const financeRepo: FinanceRepository = {
  // --- Accounts ---
  async listSources(tenantId) {
    const items = await prisma.moneySource.findMany({ where: { tenantId: tenantId } });
    return items.map(mapMoneySource);
  },
  async updateSource(tenantId, sourceId, patch) {
    const updated = await prisma.moneySource.update({
      where: { id: sourceId },
      data: { ...patch, lastUpdated: new Date() },
    });
    return mapMoneySource(updated);
  },

  // --- Treasury ---
  async listTransfers(tenantId) {
    const items = await prisma.treasuryTransfer.findMany({ where: { tenantId: tenantId } });
    return items.map(d => ({
      id: d.id,
      tenantId: d.tenantId,
      fromSourceId: d.fromSourceId,
      toSourceId: d.toSourceId,
      amount: d.amount.toNumber(),
      currency: d.currency as any,
      status: d.status as any,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      requestedBy: d.requestedBy,
    }));
  },
  async createTransfer(tenantId, transfer) {
    const created = await prisma.treasuryTransfer.create({
      data: {
        tenantId: tenantId,
        fromSourceId: transfer.fromSourceId,
        toSourceId: transfer.toSourceId,
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status,
        requestedBy: transfer.requestedBy,
      }
    });
    return { ...transfer, id: created.id, createdAt: created.createdAt.toISOString() };
  },

  // --- Settlements ---
  async listSettlements(tenantId) {
    const items = await prisma.settlementRecord.findMany({ where: { tenantId: tenantId } });
    return items.map(d => ({
      id: d.id,
      tenantId: d.tenantId,
      sourceId: d.sourceId,
      amount: d.amount.toNumber(),
      currency: d.currency as any,
      status: d.status as any,
      reference: d.reference || undefined,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  },
  async createSettlement(tenantId, settlement) {
    const created = await prisma.settlementRecord.create({
      data: {
        tenantId: tenantId,
        sourceId: settlement.sourceId,
        amount: settlement.amount,
        currency: settlement.currency,
        status: settlement.status,
        reference: settlement.reference,
      }
    });
    return { ...settlement, id: created.id, createdAt: created.createdAt.toISOString() };
  },

  // --- Payables ---
  async listPayables(tenantId) {
    const items = await prisma.payable.findMany({ where: { tenantId: tenantId } });
    return items.map(d => ({
      id: d.id,
      tenantId: d.tenantId,
      vendorName: d.vendorName,
      amount: d.amount.toNumber(),
      currency: d.currency as any,
      dueDate: d.dueDate.toISOString().split('T')[0],
      status: d.status as any,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  },
  async createPayable(tenantId, payload) {
    const created = await prisma.payable.create({
      data: {
        tenantId: tenantId,
        vendorName: payload.vendorName,
        amount: payload.amount,
        currency: payload.currency,
        dueDate: new Date(payload.dueDate),
        status: payload.status,
      }
    });
    return { ...payload, id: created.id, createdAt: created.createdAt.toISOString() };
  },
  async updatePayable(tenantId, id, patch) {
    const updated = await prisma.payable.update({
      where: { id },
      data: { ...patch, dueDate: patch.dueDate ? new Date(patch.dueDate) : undefined },
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      vendorName: updated.vendorName,
      amount: updated.amount.toNumber(),
      currency: updated.currency as any,
      dueDate: updated.dueDate.toISOString().split('T')[0],
      status: updated.status as any,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  // --- Receivables ---
  async listReceivables(tenantId) {
    const items = await prisma.receivable.findMany({ where: { tenantId: tenantId } });
    return items.map(d => ({
      id: d.id,
      tenantId: d.tenantId,
      customerName: d.customerName,
      amount: d.amount.toNumber(),
      currency: d.currency as any,
      dueDate: d.dueDate.toISOString().split('T')[0],
      status: d.status as any,
      agingBucket: (d.agingBucket as any) || "0-30",
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  },
  async createReceivable(tenantId, payload) {
    const created = await prisma.receivable.create({
      data: {
        tenantId: tenantId,
        customerName: payload.customerName,
        amount: payload.amount,
        currency: payload.currency,
        dueDate: new Date(payload.dueDate),
        status: payload.status,
        agingBucket: payload.agingBucket,
      }
    });
    return { ...payload, id: created.id, createdAt: created.createdAt.toISOString() };
  },
  async updateReceivable(tenantId, id, patch) {
    const updated = await prisma.receivable.update({
      where: { id },
      data: { ...patch, dueDate: patch.dueDate ? new Date(patch.dueDate) : undefined },
    });
    return {
      id: updated.id,
      tenantId: updated.tenantId,
      customerName: updated.customerName,
      amount: updated.amount.toNumber(),
      currency: updated.currency as any,
      dueDate: updated.dueDate.toISOString().split('T')[0],
      status: updated.status as any,
      agingBucket: (updated.agingBucket as any) || "0-30",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  // --- Ledger ---
  async listJournalEntries(tenantId) {
    const items = await prisma.journalEntry.findMany({
      where: { tenantId: tenantId },
      include: { lines: true }
    });
    return items.map(d => ({
      id: d.id,
      tenantId: d.tenantId,
      ref: d.ref || undefined,
      description: d.description,
      status: d.status as any,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      lines: d.lines.map(l => ({
        accountCode: l.accountCode,
        description: l.description,
        debit: l.debit.toNumber(),
        credit: l.credit.toNumber(),
      })),
    }));
  },
  async createJournalEntry(tenantId, payload) {
    const created = await prisma.journalEntry.create({
      data: {
        tenantId: tenantId,
        ref: payload.ref,
        description: payload.description,
        status: payload.status,
        lines: {
          create: payload.lines.map(l => ({
            accountCode: l.accountCode,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          }))
        }
      },
      include: { lines: true }
    });
    // Return structured object matching interface
    return {
       id: created.id,
       tenantId: created.tenantId,
       description: created.description,
       status: created.status as any,
       lines: payload.lines,
       createdAt: created.createdAt.toISOString(),
       updatedAt: created.updatedAt.toISOString(),
    };
  },
  async updateJournalEntry(tenantId, id, patch) {
     // Simplification: Update only main fields, not re-writing lines for now in this MVP refactor
     const updated = await prisma.journalEntry.update({
         where: { id },
         data: {
             description: patch.description,
             status: patch.status,
             ref: patch.ref,
         },
         include: { lines: true }
     });
     return {
        id: updated.id,
        tenantId: updated.tenantId,
        description: updated.description,
        status: updated.status as any,
        lines: updated.lines.map(l => ({
            accountCode: l.accountCode,
            description: l.description,
            debit: l.debit.toNumber(),
            credit: l.credit.toNumber(),
        })),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
     };
  },

  // --- Assets ---
  async listAssets(tenantId) {
    const items = await prisma.fixedAsset.findMany({ where: { tenantId: tenantId } });
    return items.map(d => ({
        id: d.id,
        tenantId: d.tenantId,
        description: d.description,
        assetClass: d.assetClass as any,
        location: d.location,
        department: d.department,
        acquisitionDate: d.acquisitionDate.toISOString().split('T')[0],
        acquisitionCost: d.acquisitionCost.toNumber(),
        usefulLifeYears: d.usefulLifeYears,
        depreciationMethod: d.depreciationMethod as any,
        residualValue: d.residualValue.toNumber(),
        status: d.status as any,
        accumulatedDepreciation: d.accumulatedDepreciation.toNumber(),
        carryingValue: d.carryingValue.toNumber(),
        revaluationReserve: d.revaluationReserve.toNumber(),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(), 
    }));
  },
  async createAsset(tenantId, payload) {
     const created = await prisma.fixedAsset.create({
         data: {
             tenantId: tenantId,
             description: payload.description,
             assetClass: payload.assetClass,
             location: payload.location,
             department: payload.department,
             acquisitionDate: new Date(payload.acquisitionDate),
             acquisitionCost: payload.acquisitionCost,
             usefulLifeYears: payload.usefulLifeYears,
             depreciationMethod: payload.depreciationMethod,
             residualValue: payload.residualValue,
             status: payload.status,
             accumulatedDepreciation: 0,
             carryingValue: payload.acquisitionCost,
             revaluationReserve: 0,
         }
     });
     return {
         ...payload,
         id: created.id,
         tenantId,
         accumulatedDepreciation: 0,
         carryingValue: payload.acquisitionCost,
         revaluationReserve: 0,
         createdAt: created.createdAt.toISOString(),
         updatedAt: created.updatedAt.toISOString(),
     };
  },
  async updateAsset(tenantId, id, patch) {
     const updated = await prisma.fixedAsset.update({
         where: { id },
         data: {
             ...patch,
             acquisitionDate: patch.acquisitionDate ? new Date(patch.acquisitionDate) : undefined,
         }
     });
     return {
        id: updated.id,
        tenantId: updated.tenantId,
        description: updated.description,
        assetClass: updated.assetClass as any,
        location: updated.location,
        department: updated.department,
        acquisitionDate: updated.acquisitionDate.toISOString().split('T')[0],
        acquisitionCost: updated.acquisitionCost.toNumber(),
        usefulLifeYears: updated.usefulLifeYears,
        depreciationMethod: updated.depreciationMethod as any,
        residualValue: updated.residualValue.toNumber(),
        status: updated.status as any,
        accumulatedDepreciation: updated.accumulatedDepreciation.toNumber(),
        carryingValue: updated.carryingValue.toNumber(),
        revaluationReserve: updated.revaluationReserve.toNumber(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
     };
  },

  // --- Capex ---
  async listCapexRequests(tenantId) {
      const items = await prisma.capexRequest.findMany({ where: { tenantId: tenantId } });
      return items.map(d => ({
          id: d.id,
          tenantId: d.tenantId,
          assetDescription: d.assetDescription,
          requestedAmount: d.requestedAmount.toNumber(),
          department: d.department,
          projectCode: d.projectCode || undefined,
          requestedBy: d.requestedBy,
          status: d.status as any,
          budgetMatched: d.budgetMatched,
          notes: d.notes || undefined,
          currentApprovalStage: (d.currentApprovalStage as any) || undefined,
          approvedBy: [], // Placeholder
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
      }));
  },
  async createCapexRequest(tenantId, payload) {
      const created = await prisma.capexRequest.create({
          data: {
            tenantId: tenantId,
            assetDescription: payload.assetDescription,
            requestedAmount: payload.requestedAmount,
            department: payload.department,
            projectCode: payload.projectCode,
            requestedBy: payload.requestedBy,
            status: payload.status,
            budgetMatched: payload.budgetMatched,
            notes: payload.notes,
            currentApprovalStage: payload.currentApprovalStage,
          }
      });
      return { 
          ...payload, 
          id: created.id, 
          createdAt: created.createdAt.toISOString(), 
          updatedAt: created.updatedAt.toISOString() 
      };
  },
  async updateCapexRequest(tenantId, id, patch) {
     const updated = await prisma.capexRequest.update({
         where: { id },
         data: patch
     });
     return {
          id: updated.id,
          tenantId: updated.tenantId,
          assetDescription: updated.assetDescription,
          requestedAmount: updated.requestedAmount.toNumber(),
          department: updated.department,
          projectCode: updated.projectCode || undefined,
          requestedBy: updated.requestedBy,
          status: updated.status as any,
          budgetMatched: updated.budgetMatched,
          notes: updated.notes || undefined,
          currentApprovalStage: (updated.currentApprovalStage as any) || undefined,
          approvedBy: [],
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
     };
  },

  // --- Placeholders (Not in Schema yet) ---
  async listPaymentRequests() { return []; },
  async createPaymentRequest(_t, p) { return p; },
  async updatePaymentRequest(_t, _id, p) { return p as any; },
  
  async listAssetDepreciationEntries() { return []; },
  async createAssetDepreciationEntry(_t, p) { return p; },
  
  async listAssetEvents() { return []; },
  async createAssetEvent(_t, p) { return p; },
};
