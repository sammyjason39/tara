import { Injectable, Logger } from '@nestjs/common';
import { FinancialEventRegistry } from '../domain/posting-gateway.interfaces';

@Injectable()
export class FinancialEventRegistryService {
  private readonly logger = new Logger(FinancialEventRegistryService.name);
  private readonly registry = new Map<string, FinancialEventRegistry>();

  constructor() {
    // Basic seeds for development
    this.seedRegistry();
  }

  /**
   * Checks if an event is registered and active.
   */
  isValid(event_type: string, version: string): boolean {
    const event = this.registry.get(event_type);
    if (!event) return false;
    
    return event.isActive && event.eventVersion === version;
  }

  /**
   * Returns the rule template ID associated with the event.
   */
  getTemplateId(event_type: string): string | undefined {
    return this.registry.get(event_type)?.ruleTemplateId;
  }

  private seedRegistry() {
    this.registry.set('SALES_COMPLETED', {
      event_type: 'SALES_COMPLETED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-SALE-001',
      isActive: true,
    });

    this.registry.set('PAYROLL_POSTED', {
      event_type: 'PAYROLL_POSTED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-PAYROLL-001',
      isActive: true,
    });

    this.registry.set('INVOICE_CREATED', {
      event_type: 'INVOICE_CREATED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-AR-INV-001',
      isActive: true,
    });

    this.registry.set('PAYMENT_RECEIVED', {
      event_type: 'PAYMENT_RECEIVED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-AR-PAY-001',
      isActive: true,
    });

    this.registry.set('PAYMENT_ALLOCATED', {
      event_type: 'PAYMENT_ALLOCATED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-AR-ALC-001',
      isActive: true,
    });

    this.registry.set('VENDOR_BILL_CREATED', {
      event_type: 'VENDOR_BILL_CREATED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-AP-BILL-001',
      isActive: true,
    });

    this.registry.set('VENDOR_PAYMENT_CREATED', {
      event_type: 'VENDOR_PAYMENT_CREATED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-AP-PAY-001',
      isActive: true,
    });

    this.registry.set('CASH_RECEIVED', {
      event_type: 'CASH_RECEIVED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-CASH-IN-001',
      isActive: true,
    });

    this.registry.set('CASH_PAID', {
      event_type: 'CASH_PAID',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-CASH-OUT-001',
      isActive: true,
    });

    this.registry.set('BANK_ADJUSTMENT', {
      event_type: 'BANK_ADJUSTMENT',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-BANK-ADJ-001',
      isActive: true,
    });

    this.registry.set('REVENUE_RECOGNIZED', {
      event_type: 'REVENUE_RECOGNIZED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-REVREC-001',
      isActive: true,
    });

    this.registry.set('ASSET_ACQUIRED', {
      event_type: 'ASSET_ACQUIRED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-ASSET-ACQ-001',
      isActive: true,
    });

    this.registry.set('ASSET_DEPRECIATED', {
      event_type: 'ASSET_DEPRECIATED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-ASSET-DEPR-001',
      isActive: true,
    });

    this.registry.set('ASSET_DISPOSED', {
      event_type: 'ASSET_DISPOSED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-ASSET-DISP-001',
      isActive: true,
    });

    this.registry.set('INVENTORY_RECEIVED', {
      event_type: 'INVENTORY_RECEIVED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-INV-REC-001',
      isActive: true,
    });

    this.registry.set('INVENTORY_ISSUED', {
      event_type: 'INVENTORY_ISSUED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-INV-ISS-001',
      isActive: true,
    });

    this.registry.set('COGS_RECORDED', {
      event_type: 'COGS_RECORDED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-COGS-001',
      isActive: true,
    });

    this.registry.set('INVENTORY_REVALUED', {
      event_type: 'INVENTORY_REVALUED',
      eventVersion: '1.0.0',
      schemaVersion: '2026-Q1',
      ruleTemplateId: 'RULE-INV-REV-001',
      isActive: true,
    });
  }
}
