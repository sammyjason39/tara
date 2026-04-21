import { Injectable } from '@nestjs/common';

export interface ReceiptData {
  storeName: string;
  address: string;
  orderNumber: string;
  date: Date;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  tax: number;
  total: number;
  paymentMethod: string;
  footerMessage?: string;
}

@Injectable()
export class RetailPrintService {
  /**
   * Generates a binary ESC/POS payload for thermal printers.
   * This is stored in retail_print_queues for delivery to the local printer.
   */
  generateReceiptPayload(data: ReceiptData): Buffer {
    const esc = {
      init: [0x1B, 0x40],
      center: [0x1B, 0x61, 0x01],
      left: [0x1B, 0x61, 0x00],
      right: [0x1B, 0x61, 0x02],
      boldOn: [0x1B, 0x45, 0x01],
      boldOff: [0x1B, 0x45, 0x00],
      doubleSizeOn: [0x1D, 0x21, 0x11],
      doubleSizeOff: [0x1D, 0x21, 0x00],
      feed: [0x1B, 0x64, 0x03],
      cut: [0x1D, 0x56, 0x41, 0x00],
    };

    const chunks: any[] = [];
    
    // Header
    chunks.push(Buffer.from(esc.init));
    chunks.push(Buffer.from(esc.center));
    chunks.push(Buffer.from(esc.doubleSizeOn));
    chunks.push(Buffer.from(`${data.storeName}\n`));
    chunks.push(Buffer.from(esc.doubleSizeOff));
    chunks.push(Buffer.from(`${data.address}\n\n`));

    // Info
    chunks.push(Buffer.from(esc.left));
    chunks.push(Buffer.from(`Order: ${data.orderNumber}\n`));
    chunks.push(Buffer.from(`Date: ${data.date.toLocaleString()}\n`));
    chunks.push(Buffer.from("--------------------------------\n"));

    // Items
    for (const item of data.items) {
      const name = item.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(3);
      const total = item.total.toFixed(2).padStart(8);
      chunks.push(Buffer.from(`${name} ${qty} ${total}\n`));
    }

    chunks.push(Buffer.from("--------------------------------\n"));

    // Summary
    chunks.push(Buffer.from(esc.right));
    chunks.push(Buffer.from(`Tax: ${data.tax.toFixed(2)}\n`));
    chunks.push(Buffer.from(esc.boldOn));
    chunks.push(Buffer.from(`TOTAL: ${data.total.toFixed(2)}\n`));
    chunks.push(Buffer.from(esc.boldOff));
    chunks.push(Buffer.from("\n"));

    // Footer
    chunks.push(Buffer.from(esc.center));
    chunks.push(Buffer.from(`Payment: ${data.paymentMethod}\n`));
    if (data.footerMessage) {
      chunks.push(Buffer.from(`${data.footerMessage}\n`));
    }
    chunks.push(Buffer.from("Thank you for shopping!\n"));

    chunks.push(Buffer.from(esc.feed));
    chunks.push(Buffer.from(esc.cut));

    return Buffer.concat(chunks);
  }
}
