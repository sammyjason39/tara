import { beforeEach, describe, expect, it } from "vitest";
import { registerDefaultRepos } from "@/core/persistence/repositoryRegistry";
import { mockSalesRepo } from "@/core/repositories/sales/mockSalesRepo";
import { financeService } from "@/core/services/finance/financeService";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { salesService } from "./salesService";

const tenantId = "tenant-sales-e2e";

const session: SessionContext = {
  userId: "sales-admin",
  tenantId,
  role: Roles.SUPERADMIN,
  departmentId: "SALES",
};

describe("salesService end-to-end flows", () => {
  beforeEach(() => {
    registerDefaultRepos();
    window.localStorage.clear();
  });

  it("runs lead to opportunity to quote lifecycle", () => {
    const lead = salesService.createLead(tenantId, session, {
      companyName: "Helios Manufacturing",
      contactName: "Mia Chen",
      source: "MARKETING",
      potentialValue: 250000,
      currency: "USD",
      priority: "HIGH",
    });
    salesService.updateLeadStatus(tenantId, session, lead.id, "CONTACTED");
    salesService.updateLeadStatus(tenantId, session, lead.id, "QUALIFIED");
    const opportunity = salesService.convertLeadToOpportunity(tenantId, session, lead.id);
    salesService.moveOpportunityStage(tenantId, session, opportunity.id, "PROPOSAL");
    const quote = salesService.createQuote(tenantId, session, {
      opportunityId: opportunity.id,
      amount: 250000,
      discountPercent: 5,
    });
    const submitted = salesService.submitQuoteForApproval(tenantId, session, quote.id);
    const approved = salesService.decideQuoteApproval(tenantId, session, quote.id, true);
    const sent = salesService.sendQuoteToCustomer(tenantId, session, quote.id);

    expect(submitted.status).toBe("PENDING_APPROVAL");
    expect(approved.status).toBe("APPROVED");
    expect(sent.status).toBe("SENT");
  });

  it("closes won opportunity and creates order with finance invoice handoff", () => {
    const [opportunity] = salesService.listOpportunities(tenantId);
    const order = salesService.closeWonOpportunity(tenantId, session, opportunity.id);
    const receivables = financeService.listReceivables(tenantId);

    expect(order.status).toBe("INVOICED");
    expect(order.financeInvoiceId).toBeDefined();
    expect(receivables.some((item) => item.id === order.financeInvoiceId)).toBe(true);
  });

  it("flags lead/task SLA breaches during sweep", () => {
    const [lead] = salesService.listLeads(tenantId);
    const overdueTask = salesService.createTask(tenantId, session, {
      title: "Overdue follow-up",
      dueAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      ownerId: "rep-jessie",
      ownerName: "Jessie Allan",
      leadId: lead.id,
      priority: "URGENT",
    });

    mockSalesRepo.updateLead(tenantId, lead.id, {
      status: "NEW",
      slaDueAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    });

    const alerts = salesService.runSlaSweep(tenantId, session);
    expect(alerts.some((item) => item.entityId === lead.id)).toBe(true);
    expect(alerts.some((item) => item.entityId === overdueTask.id)).toBe(true);
  });
});
