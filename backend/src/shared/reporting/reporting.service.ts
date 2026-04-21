import { Injectable, Logger } from '@nestjs/common';
const PDFDocument = require('pdfkit');
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  /**
   * Generates a PDF report from a set of data and a title.
   */
  async generatePdf(title: string, headers: string[], data: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown();

      // Table Header
      const colWidth = (500) / headers.length;
      let x = 50;
      doc.fontSize(12).fillColor('blue');
      headers.forEach(header => {
        doc.text(header, x, doc.y, { width: colWidth, align: 'left' });
        x += colWidth;
      });
      doc.moveDown();
      doc.fillColor('black');

      // Table Data
      data.forEach(row => {
        x = 50;
        headers.forEach(header => {
          const val = row[header.toLowerCase().replace(/ /g, '_')] || '';
          doc.fontSize(10).text(String(val), x, doc.y, { width: colWidth, align: 'left' });
          x += colWidth;
        });
        doc.moveDown(0.5);
      });

      doc.end();
    });
  }

  /**
   * Generates a CSV/Excel report.
   */
  async generateExcel(title: string, headers: string[], data: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);

    worksheet.columns = headers.map(h => ({
      header: h,
      key: h.toLowerCase().replace(/ /g, '_'),
      width: 20,
    }));

    worksheet.addRows(data);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer as any);
  }
}

