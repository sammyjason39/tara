import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { CreateFileDto } from "./dto/create-file.dto";
import { CreateNoteDto } from "./dto/create-note.dto";
import { AuditService } from "../../shared/audit/audit.service";
import { FileProcessingService } from "../../shared/file-processing/file-processing.service";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

// UUID v4 pattern — used to sanitize FK fields before Prisma writes
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const toUuid = (v?: string | null): string | undefined =>
  v && UUID_RE.test(v) ? v : undefined;

@Injectable()
export class ExplorerService {
  private readonly uploadDir = path.join(process.cwd(), "uploads");

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly fileProcessingService: FileProcessingService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Security: Magic Number Verification
   * Verifies file integrity by checking the binary header (magic numbers).
   */
  private verifyMagicNumber(buffer: Buffer, expectedType: string): boolean {
    const header = buffer.toString("hex", 0, 8).toUpperCase();
    
    // PNG
    if (expectedType.includes("png") && header.startsWith("89504E47")) return true;
    
    // JPG/JPEG
    if ((expectedType.includes("jpg") || expectedType.includes("jpeg")) && header.startsWith("FFD8FF")) return true;
    
    // PDF
    if (expectedType.includes("pdf") && header.startsWith("25504446")) return true;

    // ZIP/XLSX/DOCX
    if ((expectedType.includes("xlsx") || expectedType.includes("docx") || expectedType.includes("zip")) && header.startsWith("504B0304")) return true;

    // MP4
    if (expectedType.includes("video/mp4") && header.includes("66747970")) return true;

    // Text/CSV/JSON (No magic numbers, check for basic sanity)
    if (expectedType.includes("text") || expectedType.includes("csv") || expectedType.includes("json")) return true;

    return false;
  }

  /**
   * Security: Sanitization for CSV Injection
   */
  private sanitizeContent(content: string): string {
    return content.split("\n").map(line => {
      return line.split(",").map(cell => {
        const trimmed = cell.trim();
        if (/^[=+\-@]/.test(trimmed)) {
          return `'${trimmed}`;
        }
        return cell;
      }).join(",");
    }).join("\n");
  }

  async createFolder(ctx: any, dto: CreateFolderDto) {
    const { tenant_id, company_id, department_id, branch_id, ecommerce_id, user_id } = ctx;
    return this.prisma.explorer_folders.create({
      data: {
        tenant_id,
        company_id: toUuid(dto.company_id) ?? toUuid(company_id) ?? null,
        department_id: toUuid(dto.department_id) ?? toUuid(department_id) ?? null,
        branch_id: toUuid(dto.branch_id) ?? toUuid(branch_id) ?? null,
        ecommerce_id: toUuid(dto.ecommerce_id) ?? toUuid(ecommerce_id) ?? null,
        access_level: dto.access_level || "private",
        name: dto.name,
        parent_id: dto.parent_id,
      },
    });
  }

  async uploadFile(
    ctx: any, 
    file: Express.Multer.File, 
    dto: CreateFileDto
  ) {
    const { tenant_id, user_id, company_id, department_id, branch_id, ecommerce_id } = ctx;

    // 1. Security Scan
    if (!this.verifyMagicNumber(file.buffer, file.mimetype)) {
      throw new ForbiddenException("Security Violation: File content does not match extension.");
    }

    // 2. Storage
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(this.uploadDir, fileName);
    
    fs.writeFileSync(filePath, file.buffer);

    // 3. Persistence with Privacy Defaults
    const record = await this.prisma.explorer_files.create({
      data: {
        tenant_id,
        company_id: toUuid(dto.company_id) ?? toUuid(company_id) ?? null,
        department_id: toUuid(dto.department_id) ?? toUuid(department_id) ?? null,
        branch_id: toUuid(dto.branch_id) ?? toUuid(branch_id) ?? null,
        ecommerce_id: toUuid(dto.ecommerce_id) ?? toUuid(ecommerce_id) ?? null,
        owner_id: user_id,
        folder_id: dto.folder_id,
        access_level: dto.access_level || "private", // Respect DTO if provided
        name: file.originalname,
        type: file.originalname.split(".").pop() || "unknown",
        size: file.size,
        mime_type: file.mimetype,
        storage_path: fileName,
        metadata: dto.metadata || {},
        history: [{ user_id, action: "CREATED", timestamp: new Date().toISOString() }],
      },
    });

    await this.auditService.log({
      tenant_id,
      user_id,
      module: "EXPLORER",
      action: "UPLOAD_FILE",
      entity_type: "FILE",
      entity_id: record.id,
      metadata: { name: file.originalname, size: file.size },
    });

    return record;
  }

  async getFileSystem(ctx: any, folder_id?: string) {
    const { tenant_id, user_id, department_id, company_id, role } = ctx;

    // 1. Identify Accessible Companies (Recursive Hierarchy)
    let accessibleCompanyIds = [company_id];
    if (role === "SUPERADMIN" || role === "OWNER") {
      // High-tier can see all companies in tenant
      const allCompanies = await this.prisma.companies.findMany({
        where: { tenant_id },
        select: { id: true }
      });
      accessibleCompanyIds = allCompanies.map(c => c.id);
    } else {
      // Get all child companies recursively
      const childCompanies = await this.prisma.$queryRawUnsafe<any[]>(`
        WITH RECURSIVE company_tree AS (
          SELECT id FROM companies WHERE id = $1
          UNION ALL
          SELECT c.id FROM companies c
          INNER JOIN company_tree ct ON c.parent_id = ct.id
        )
        SELECT id FROM company_tree
      `, company_id);
      accessibleCompanyIds = childCompanies.map(c => c.id);
    }

    // 2. Build Permission-Based Where Clauses
    const folderWhere: any = {
      tenant_id,
      deleted_at: null,
      OR: [
        { 
          department_id, 
          access_level: "department" 
        },
        {
          company_id: { in: accessibleCompanyIds },
          access_level: { in: ["department", "shared"] }
        },
        {
          access_level: "shared" 
        }
      ]
    };

    const fileWhere: any = {
      tenant_id,
      deleted_at: null,
      OR: [
        { owner_id: user_id }, // My Private files
        { 
          department_id, 
          access_level: "department" 
        },
        {
          company_id: { in: accessibleCompanyIds },
          access_level: { in: ["department", "shared"] }
        },
        {
          company_id: null,
          access_level: "shared" 
        }
      ]
    };

    // Override for Admin/Owner to see all in their accessible scope
    if (role === "SUPERADMIN" || role === "OWNER") {
      const adminOr = [
        { company_id: { in: accessibleCompanyIds } },
        { company_id: null }
      ];
      folderWhere.OR = adminOr;
      fileWhere.OR = adminOr;
    }

    const [folders, files] = await Promise.all([
      this.prisma.explorer_folders.findMany({
        where: { 
          ...folderWhere, 
          parent_id: folder_id ?? null 
        },
      }),
      this.prisma.explorer_files.findMany({
        where: { 
          ...fileWhere, 
          folder_id: folder_id ?? null 
        },
      }),
    ]);

    const currentFolder = folder_id 
      ? await this.prisma.explorer_folders.findUnique({ where: { id: folder_id } })
      : null;

    return { folders, files, currentFolder };
  }

  async getFile(ctx: any, file_id: string) {
    const { tenant_id, user_id, role } = ctx;
    const file = await this.prisma.explorer_files.findFirst({
      where: { id: file_id, tenant_id, deleted_at: null },
      include: {
        owner: { select: { first_name: true, last_name: true, email: true } },
        last_editor: { select: { first_name: true, last_name: true } },
      },
    });

    if (!file) throw new ForbiddenException("File not found.");

    // Enforce Privacy Check
    if (file.owner_id !== user_id && role !== "SUPERADMIN" && role !== "OWNER") {
      if (file.access_level === "private") {
        throw new ForbiddenException("This is a private file.");
      }
      // TODO: Add more granular checks if needed (e.g. sibling dept check)
    }

    let content = "";
    const filePath = path.join(this.uploadDir, file.storage_path);
    if (fs.existsSync(filePath)) {
      // Only read content for text-based files
      const textTypes = ["doc", "sheet", "slide", "txt", "csv", "json"];
      if (textTypes.includes(file.type)) {
        content = fs.readFileSync(filePath, "utf-8");
      }
    }

    return { ...file, content };
  }

  async updateFile(
    ctx: any,
    file_id: string,
    data: { name?: string; content?: string | Buffer },
  ) {
    const { tenant_id, user_id, role } = ctx;
    const file = await this.prisma.explorer_files.findFirst({
      where: { id: file_id, tenant_id },
    });

    if (!file) throw new ForbiddenException("File not found.");

    // Enforce Edit Permission (Owner or Admin)
    if (file.owner_id !== user_id && role !== "SUPERADMIN" && role !== "OWNER") {
      throw new ForbiddenException("You do not have permission to edit this file.");
    }

    // Update storage if content provided
    if (data.content) {
      const filePath = path.join(this.uploadDir, file.storage_path);
      fs.writeFileSync(filePath, data.content);
    }

    const currentHistory = (file.history as any[]) || [];
    const newEntry = { user_id, action: "EDITED", timestamp: new Date().toISOString() };

    return this.prisma.explorer_files.update({
      where: { id: file_id },
      data: {
        name: data.name ?? file.name,
        last_edited_by: user_id,
        updated_at: new Date(),
        history: [...currentHistory, newEntry],
      },
    });
  }

  async deleteFile(ctx: any, file_id: string) {
    const { tenant_id, user_id, role } = ctx;
    const file = await this.prisma.explorer_files.findFirst({
      where: { id: file_id, tenant_id },
    });

    if (!file) throw new ForbiddenException("File not found or access denied.");

    // Enforce Delete Permission
    if (file.owner_id !== user_id && role !== "SUPERADMIN" && role !== "OWNER") {
      throw new ForbiddenException("You do not have permission to delete this file.");
    }

    await this.prisma.explorer_files.update({
      where: { id: file_id },
      data: { deleted_at: new Date() },
    });

    await this.auditService.log({
      tenant_id,
      user_id,
      module: "EXPLORER",
      action: "DELETE_FILE",
      entity_type: "FILE",
      entity_id: file_id,
    });

    return { success: true };
  }

  async restoreFile(ctx: any, file_id: string) {
    const { tenant_id } = ctx;
    return this.prisma.explorer_files.update({
      where: { id: file_id, tenant_id },
      data: { deleted_at: null },
    });
  }

  async moveFile(ctx: any, file_id: string, folder_id: string | null) {
    const { tenant_id } = ctx;
    return this.prisma.explorer_files.update({
      where: { id: file_id, tenant_id },
      data: { folder_id },
    });
  }

  async listRecycleBin(ctx: any) {
    const { tenant_id, user_id, role, company_id } = ctx;
    
    const [folders, files] = await Promise.all([
      this.prisma.explorer_folders.findMany({
        where: { tenant_id, NOT: { deleted_at: null } },
      }),
      this.prisma.explorer_files.findMany({
        where: { tenant_id, NOT: { deleted_at: null } },
      }),
    ]);

    return { folders, files };
  }

  async renameFolder(ctx: any, folder_id: string, name: string) {
    const { tenant_id } = ctx;
    return this.prisma.explorer_folders.update({
      where: { id: folder_id, tenant_id },
      data: { name },
    });
  }

  /**
   * Forensic Generation
   * Generates a unique traceable code for exports.
   */
  async generateForensicCode(params: {
    tenant_id: string;
    user_id: string;
    ip: string;
    company_id?: string;
    branch_id?: string;
  }) {
    const raw = `${params.user_id}-${params.ip}-${Date.now()}-${Math.random()}`;
    const code = createHash("sha256").update(raw).digest("hex").substring(0, 12).toUpperCase();

    await this.prisma.export_audit_trail.create({
      data: {
        tenant_id: params.tenant_id,
        company_id: params.company_id,
        user_id: params.user_id,
        forensic_code: code,
        ip_address: params.ip,
        metadata: {
          branch_id: params.branch_id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return code;
  }

  async downloadFile(ctx: any, file_id: string) {
    const { tenant_id, user_id, role } = ctx;
    const file = await this.prisma.explorer_files.findFirst({
      where: { id: file_id, tenant_id, deleted_at: null },
    });

    if (!file) throw new ForbiddenException("File not found or access denied.");

    // Enforce Privacy Check
    if (file.owner_id !== user_id && role !== "SUPERADMIN" && role !== "OWNER") {
      if (file.access_level === "private") {
        throw new ForbiddenException("This is a private file.");
      }
    }

    const filePath = path.join(this.uploadDir, file.storage_path);
    if (!fs.existsSync(filePath)) {
      throw new ForbiddenException("File storage integrity error.");
    }

    await this.auditService.log({
      tenant_id,
      user_id,
      module: "EXPLORER",
      action: "DOWNLOAD_FILE",
      entity_type: "FILE",
      entity_id: file_id,
      metadata: { name: file.name },
    });

    return {
      buffer: fs.readFileSync(filePath),
      mimeType: file.mime_type,
      fileName: file.name,
    };
  }

  async createNote(ctx: any, dto: CreateNoteDto) {
    const { tenant_id, company_id, department_id, user_id } = ctx;
    return this.prisma.explorer_notes.create({
      data: {
        tenant_id,
        company_id: toUuid(dto.company_id) ?? toUuid(company_id) ?? null,
        department_id: toUuid(dto.department_id) ?? toUuid(department_id) ?? null,
        owner_id: user_id,
        title: dto.title,
        content: dto.content,
      },
    });
  }
}
