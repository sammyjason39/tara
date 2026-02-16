import {
  ensureSeed,
  saveToStorage,
} from "@/core/repositories/hr/storage";

export interface EcommerceConnector {
  id: string;

  companyId: string;
  branchId: string;

  domain: string;

  apiKey: string;
  status: "active" | "frozen";

  createdAt: string;
}

const key = "retail:ecommerce_connectors";

const seed: EcommerceConnector[] = [
  {
    id: "eco-001",
    companyId: "comp-A",
    branchId: "branch-JKT",

    domain: "mockshop.local",

    apiKey: "trial-secret-key-001",
    status: "active",

    createdAt: new Date().toISOString(),
  },
];

export const ecommerceConnectorRepo = {
  list(): EcommerceConnector[] {
    return ensureSeed<EcommerceConnector[]>(key, seed);
  },

  findByApiKey(apiKey: string): EcommerceConnector | null {
    return this.list().find((x) => x.apiKey === apiKey) ?? null;
  },

  create(connector: EcommerceConnector) {
    const next = [connector, ...this.list()];
    saveToStorage(key, next);
    return connector;
  },
};
