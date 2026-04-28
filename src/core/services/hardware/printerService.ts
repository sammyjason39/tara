import { apiRequest } from "@/core/api/apiClient";
import { SessionContext } from "@/core/security/session";

export interface ReceiptData {
  storeName: string;
  storeAddress: string;
  orderId: string;
  date: string;
  cashier: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  paymentMethod: string;
  receivedAmount?: number;
  changeAmount?: number;
  notes?: string;
}

export const printerService = {
  /**
   * Generates a thermal-optimized receipt buffer or triggers local print agent.
   */
  async printReceipt(tenantId: string, actor: SessionContext, data: ReceiptData) {
    // In a real implementation, this would either:
    // 1. Send data to a local Print Agent via WebSockets/HTTP
    // 2. Generate a PDF blob for the browser to print
    // 3. Send ESC/POS commands directly via WebUSB/Bluetooth
    
    console.log("[printerService] Dispatching Receipt to Thermal Engine:", data);
    
    // Triggering the Print Dialog or Agent
    return apiRequest<{ success: boolean }>(`/retail/printer/print`, "POST", actor, data);
  },

  /**
   * Formats raw text into ESC/POS command sequences.
   */
  formatESC(data: ReceiptData): string {
    // Placeholder for actual ESC/POS formatting logic
    let receipt = `\x1B\x40`; // Initialize
    receipt += `\x1B\x61\x01${data.storeName}\n`; // Center
    receipt += `\x1B\x61\x01${data.storeAddress}\n`;
    receipt += `--------------------------------\n`;
    receipt += `Order: ${data.orderId.slice(-6).toUpperCase()}\n`;
    receipt += `Date: ${data.date}\n`;
    receipt += `Cashier: ${data.cashier}\n`;
    receipt += `--------------------------------\n`;
    
    data.items.forEach(item => {
      receipt += `${item.name.substring(0, 20).padEnd(20)} ${item.quantity}x ${item.price}\n`;
    });
    
    receipt += `--------------------------------\n`;
    receipt += `SUBTOTAL: ${data.subtotal}\n`;
    receipt += `TAX:      ${data.tax}\n`;
    receipt += `TOTAL:    ${data.grandTotal}\n`;
    receipt += `--------------------------------\n`;
    receipt += `\x1B\x61\x01THANK YOU FOR SHOPPING!\n`;
    receipt += `\x1B\x64\x05`; // Feed 5 lines
    receipt += `\x1D\x56\x01`; // Cut
    
    return receipt;
  }
};
