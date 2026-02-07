export type PosConfig = {
  deviceType: "KIOSK" | "TABLET" | "DESKTOP";
  apiEndpoint: string;
  timeout?: number;
  supportedTerminals: string[];
};

export const posConfig: PosConfig = {
  deviceType: "TABLET",
  apiEndpoint: "https://mock-pos.local",
  timeout: 5000,
  supportedTerminals: ["POS-001", "POS-002", "POS-003"],
};
