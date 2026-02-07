import type { PayrollComponent } from "./types";

export function calculateNetPay(components: PayrollComponent[]): number {
  return components.reduce((total, component) => {
    if (component.type === "deduction" || component.type === "tax") {
      return total - component.amount;
    }
    return total + component.amount;
  }, 0);
}
