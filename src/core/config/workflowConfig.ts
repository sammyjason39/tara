export type WorkflowConfig = {
  approvalThresholds: {
    payroll: number;
    payment: number;
    purchase: number;
  };
  notificationChannels: ("email" | "sms" | "inApp")[];
};

export const workflowConfig: WorkflowConfig = {
  approvalThresholds: {
    payroll: 10000000, // e.g., IDR 10,000,000
    payment: 5000000, // e.g., IDR 5,000,000
    purchase: 2000000, // e.g., IDR 2,000,000
  },
  notificationChannels: ["email", "inApp"],
};
