import { Injectable, Logger } from "@nestjs/common";
import csv from "csv-parser";
import * as ExcelJS from "exceljs";
import { Readable } from "stream";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import AdmZip from "adm-zip";

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);

  /**
   * Sanitizes a value to prevent CSV/Excel injection.
   * Strips prefix characters: =, +, -, @
   */
  private sanitizeValue(value: any): any {
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) {
      return `'${value}`; // Prepend single quote as per Excel security best practices
    }
    return value;
  }

  /**
   * Normalizes a header key to lowercase snake_case.
   */
  private normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
  }

  /**
   * Parses a CSV buffer into an array of DTO instances and validates them.
   */
  async parseCsv<T>(
    buffer: Buffer,
    dtoClass: new () => T,
  ): Promise<{ data: T[]; errors: any[] }> {
    const results: any[] = [];
    const stream = Readable.from(buffer as any);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (data: any) => {
          const sanitized: any = {};
          for (const key in data) {
            const normalizedKey = this.normalizeKey(key);
            sanitized[normalizedKey] = this.sanitizeValue(data[key]);
          }
          results.push(sanitized);
        })
        .on("end", () => resolve(results))
        .on("error", (err: any) => reject(err));
    });

    return this.validateData(results, dtoClass);
  }

  /**
   * Streams a CSV file from disk and processes it row by row, awaiting the callback.
   */
  async parseCsvStream(
    filePath: string,
    onRow: (data: any) => Promise<void>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath).pipe(csv());

      stream.on("data", async (data: any) => {
        stream.pause();
        try {
          const sanitized: any = {};
          for (const key in data) {
            sanitized[this.normalizeKey(key)] = this.sanitizeValue(data[key]);
          }
          await onRow(sanitized);
        } catch (err) {
          this.logger.error(`CSV Row Error: ${err.message}`);
        } finally {
          stream.resume();
        }
      });

      stream.on("end", () => resolve());
      stream.on("error", (error) => reject(error));
    });
  }

  /**
   * Parses an Excel buffer into an array of DTO instances and validates them.
   */
  async parseExcel<T>(
    buffer: Buffer,
    dtoClass: new () => T,
  ): Promise<{ data: T[]; errors: any[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet(1);
    const results: any[] = [];

    if (!worksheet) {
      return { data: [], errors: [{ message: "No worksheet found" }] };
    }

    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell: ExcelJS.Cell, colNumber: number) => {
      const rawHeader = cell.value?.toString() || "";
      headers[colNumber] = this.normalizeKey(rawHeader);
    });

    worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (rowNumber === 1) return; // Skip headers
      const rowData: any = {};
      row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = this.sanitizeValue(cell.value);
        }
      });
      results.push(rowData);
    });

    return this.validateData(results, dtoClass);
  }

  /**
   * Streams an Excel file from disk and processes it row by row, awaiting the callback.
   */
  async parseExcelStream(
    filePath: string,
    onRow: (data: any) => Promise<void>,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new Error("Worksheet not found");

    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell: ExcelJS.Cell, colNumber: number) => {
      headers[colNumber] = this.normalizeKey(cell.value?.toString() || "");
    });

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowData: any = {};
      row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        const header = headers[colNumber];
        if (header) rowData[header] = this.sanitizeValue(cell.value);
      });
      
      await onRow(rowData);
    }
  }

  /**
   * Extracts images from a ZIP file and calls a callback for each.
   */
  async processZipImages(
    zipPath: string,
    callback: (fileName: string, buffer: Buffer) => Promise<void>,
  ): Promise<{ total: number; processed: number; errors: string[] }> {
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    let processed = 0;
    const errors: string[] = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;

      try {
        const buffer = entry.getData();
        await callback(entry.name, buffer);
        processed++;
      } catch (err) {
        errors.push(`${entry.name}: ${err.message}`);
      }
    }

    return { total: zipEntries.length, processed, errors };
  }

  /**
   * Generates a CSV string from data.
   */
  async generateCsv(data: any[]): Promise<string> {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]);
    const rows = data.map((obj) =>
      headers
        .map((header) => JSON.stringify(this.sanitizeValue(obj[header]) ?? ""))
        .join(","),
    );
    return [headers.join(","), ...rows].join("\n");
  }

  /**
   * Generates an Excel buffer from data with forensic marks and watermarks.
   */
  async generateExcel(
    data: any[],
    columns: { header: string; key: string; width?: number }[],
    options?: {
      traceId?: string;
      watermark?: {
        text: string;
        opacity?: number;
        size?: number;
        position?: { x: number; y: number };
      };
    },
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Zenvix Export");

    // 1. Forensic Traceability (Hidden)
    if (options?.traceId) {
      workbook.creator = "Zenvix System";
      workbook.lastModifiedBy = "Zenvix System";
      const hiddenSheet = workbook.addWorksheet("_system_meta", {
        state: "veryHidden",
      });
      hiddenSheet.getCell("A1").value = "Zenvix-Trace-ID";
      hiddenSheet.getCell("B1").value = options.traceId;
      hiddenSheet.getCell("A2").value = "Export-Timestamp";
      hiddenSheet.getCell("B2").value = new Date().toISOString();

      const forensicCell = worksheet.getCell("Z999");
      forensicCell.value = `TRACE:${options.traceId}`;
      forensicCell.font = { color: { argb: "FFFFFFFF" }, size: 2 };
      forensicCell.protection = { locked: true };
    }

    // 2. Visible Watermark
    if (options?.watermark?.text) {
      const wmText = options.watermark.text;
      const posX = options.watermark.position?.x || 1;
      const posY = options.watermark.position?.y || 1;
      const size = options.watermark.size || 72;
      const opacity = options.watermark.opacity || 0.2;
      const argbOpacity = Math.round(opacity * 255)
        .toString(16)
        .padStart(2, "0");

      const wmCell = worksheet.getCell(posY, posX);
      wmCell.value = wmText;
      wmCell.font = {
        size: size,
        bold: true,
        color: { argb: `${argbOpacity}808080` },
      };
      wmCell.alignment = { vertical: "middle", horizontal: "center" };
    }

    worksheet.columns = columns;
    worksheet.addRows(
      data.map((row) => {
        const sanitized: any = {};
        for (const key in row) {
          sanitized[key] = this.sanitizeValue(row[key]);
        }
        return sanitized;
      }),
    );

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    return (await workbook.xlsx.writeBuffer()) as any;
  }

  private async validateData<T>(
    rawResults: any[],
    dtoClass: new () => T,
  ): Promise<{ data: T[]; errors: any[] }> {
    const validData: T[] = [];
    const allErrors: any[] = [];

    for (let i = 0; i < rawResults.length; i++) {
      const instance = plainToInstance(dtoClass, rawResults[i]);
      const errors = await validate(instance as any);

      if (errors.length > 0) {
        allErrors.push({
          row: i + 2,
          errors: errors.map((e) => ({
            property: e.property,
            constraints: e.constraints,
          })),
        });
      } else {
        validData.push(instance);
      }
    }

    return { data: validData, errors: allErrors };
  }
}
