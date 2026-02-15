import type {
  DevicePool,
  EvidencePack,
  PaymentAuditEvent,
  PaymentChargeback,
  PaymentDispute,
  PaymentProvider,
  PaymentRefund,
  PaymentTransaction,
  PosDevice,
  RoutingPolicy,
  SettlementRecord,
} from "@/core/types/payment/payment";

export interface PaymentRepository {
  listTransactions: (tenantId: string) => PaymentTransaction[];
  createTransaction: (
    tenantId: string,
    payload: PaymentTransaction,
  ) => PaymentTransaction;
  updateTransaction: (
    tenantId: string,
    id: string,
    patch: Partial<PaymentTransaction>,
  ) => PaymentTransaction | null;

  listProviders: (tenantId: string) => PaymentProvider[];
  updateProvider: (
    tenantId: string,
    id: string,
    patch: Partial<PaymentProvider>,
  ) => PaymentProvider | null;

  listRoutingPolicies: (tenantId: string) => RoutingPolicy[];
  updateRoutingPolicy: (
    tenantId: string,
    id: string,
    patch: Partial<RoutingPolicy>,
  ) => RoutingPolicy | null;

  listDevices: (tenantId: string) => PosDevice[];
  updateDevice: (
    tenantId: string,
    id: string,
    patch: Partial<PosDevice>,
  ) => PosDevice | null;
  listDevicePools: (tenantId: string) => DevicePool[];
  listDisputes: (tenantId: string) => PaymentDispute[];
  createDispute: (tenantId: string, payload: PaymentDispute) => PaymentDispute;
  updateDispute: (
    tenantId: string,
    id: string,
    patch: Partial<PaymentDispute>,
  ) => PaymentDispute | null;

  listChargebacks: (tenantId: string) => PaymentChargeback[];
  createChargeback: (
    tenantId: string,
    payload: PaymentChargeback,
  ) => PaymentChargeback;
  updateChargeback: (
    tenantId: string,
    id: string,
    patch: Partial<PaymentChargeback>,
  ) => PaymentChargeback | null;

  listRefunds: (tenantId: string) => PaymentRefund[];
  createRefund: (tenantId: string, payload: PaymentRefund) => PaymentRefund;
  updateRefund: (
    tenantId: string,
    id: string,
    patch: Partial<PaymentRefund>,
  ) => PaymentRefund | null;

  listSettlements: (tenantId: string) => SettlementRecord[];
  createSettlement: (
    tenantId: string,
    payload: SettlementRecord,
  ) => SettlementRecord;
  updateSettlement: (
    tenantId: string,
    id: string,
    patch: Partial<SettlementRecord>,
  ) => SettlementRecord | null;

  listEvidencePacks: (tenantId: string) => EvidencePack[];
  createEvidencePack: (tenantId: string, payload: EvidencePack) => EvidencePack;

  listAuditEvents: (tenantId: string) => PaymentAuditEvent[];
  createAuditEvent: (
    tenantId: string,
    payload: PaymentAuditEvent,
  ) => PaymentAuditEvent;
}
