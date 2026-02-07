export type BankApiConfig = {
  baseUrl: string;
  apiKey: string;
  timeout?: number; // milliseconds
  supportedBanks: string[];
};

export const bankApiConfig: BankApiConfig = {
  baseUrl: "https://mock-bank-api.local",
  apiKey: "mock-api-key",
  timeout: 5000,
  supportedBanks: ["BCA", "MANDIRI", "BNI", "BRI", "CIMB"],
};
