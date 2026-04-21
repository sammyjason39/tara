import { Injectable, Logger } from "@nestjs/common";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

export enum ContractType {
  EMPLOYMENT = "EMPLOYMENT",
  SUPPLIER = "SUPPLIER",
}

@Injectable()
export class ContractGeneratorService {
  private readonly logger = new Logger(ContractGeneratorService.name);

  /**
   * Generates a PDF buffer for the requested contract type and data.
   */
  async generateContractPDF(
    tenant_id: string,
    type: ContractType,
    data: any,
  ): Promise<Buffer> {
    this.logger.log(`Generating ${type} contract for tenant ${tenant_id}`);

    const doc = new PDFDocument({ margin: 50 });
    const stream = new PassThrough();
    const buffers: Buffer[] = [];

    stream.on("data", (chunk) => buffers.push(chunk));

    return new Promise((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(buffers)));
      stream.on("error", (err) => reject(err));

      doc.pipe(stream);

      // --- Brand Header ---
      doc.font("Helvetica-Bold").fontSize(20).text("ZENVIX BUSINESS OS", { align: "center" });
      doc.font("Helvetica").fontSize(10).text("Legal Document Management System", { align: "center" });
      doc.moveDown(2);

      if (type === ContractType.EMPLOYMENT) {
        this.renderEmploymentTemplate(doc, data);
      } else {
        this.renderSupplierTemplate(doc, data);
      }

      // --- Footer ---
      doc.fontSize(8).text(
        `Generated on ${new Date().toISOString()} | Tenant Reference: ${tenant_id}`,
        50,
        750,
        { align: "center" },
      );

      doc.end();
    });
  }

  private renderEmploymentTemplate(doc: PDFKit.PDFDocument, data: any) {
    doc.font("Helvetica-Bold").fontSize(16).text("EMPLOYMENT AGREEMENT", { underline: true });
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(12).text(`This agreement is made between:`);
    doc.font("Helvetica").text(`Employer: ${data.companyName || "The Company"}`);
    doc.text(`Employee: ${data.employeeName}`);
    doc.moveDown();

    doc.text(`Position: ${data.position}`);
    doc.text(`Salary: ${data.currency || "IDR"} ${data.salary || 0}`);
    doc.text(`Start Date: ${data.startDate || "TBD"}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(12).text("Terms & Conditions:", { underline: true });
    doc.font("Helvetica").fontSize(10).text(
      "1. The employee agrees to perform the duties of the position to the best of their ability.\n" +
      "2. The employer agrees to provide the compensation and benefits outlined above.\n" +
      "3. This contract is subject to the local labor laws of the registered entity.",
    );
    doc.moveDown(4);

    // Signature blocks
    doc.text("__________________________", 50, doc.y);
    doc.text("__________________________", 350, doc.y - 12);
    doc.text("Employer Signature", 50, doc.y);
    doc.text("Employee Signature", 350, doc.y - 12);
  }

  private renderSupplierTemplate(doc: PDFKit.PDFDocument, data: any) {
    doc.font("Helvetica-Bold").fontSize(16).text("SUPPLIER MASTER AGREEMENT", { underline: true });
    doc.moveDown();

    doc.font("Helvetica").fontSize(12).text(`Client: ${data.companyName || "Zenvix Client"}`);
    doc.text(`Supplier: ${data.supplierName}`);
    doc.moveDown();

    doc.text(`Agreement Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Reference PR/PO: ${data.requisitionId || "N/A"}`);
    doc.moveDown();

    doc.font("Helvetica-Bold").fontSize(12).text("Scope of Work:", { underline: true });
    doc.font("Helvetica").fontSize(10).text(
      data.scopeOfWork || "General supply of goods and services as outlined in the Purchase Order.",
    );
    doc.moveDown(4);

    doc.text("__________________________", 50, doc.y);
    doc.text("__________________________", 350, doc.y - 12);
    doc.text("Authorized Client", 50, doc.y);
    doc.text("Authorized Supplier", 350, doc.y - 12);
  }
}
