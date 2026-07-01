import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SopService {
  private readonly logger = new Logger(SopService.name);
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    // Use persistent storage directory — survives container restarts on VPS
    this.uploadDir = process.env.SOP_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads', 'sop');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created SOP upload directory: ${this.uploadDir}`);
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  async create(data: {
    title: string;
    description?: string;
    category?: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_by?: string;
  }) {
    return this.prisma.sopDocument.create({ data });
  }

  async createMany(docs: Array<{
    title: string;
    description?: string | null;
    category?: string | null;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    uploaded_by?: string;
  }>) {
    if (docs.length === 0) return [];

    return this.prisma.$transaction(async (tx) => {
      const created = [];
      for (const doc of docs) {
        created.push(await tx.sopDocument.create({ data: doc }));
      }
      return created;
    });
  }

  /** Remove a file from disk if DB insert fails or upload is rejected */
  async removeUploadedFile(storedFilename: string): Promise<void> {
    if (!storedFilename) return;
    const fullPath = path.resolve(this.uploadDir, storedFilename);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`Removed orphan SOP upload: ${fullPath}`);
    }
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { is_active: true };
    return this.prisma.sopDocument.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string) {
    const doc = await this.prisma.sopDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('SOP document not found');
    return doc;
  }

  async update(id: string, data: { title?: string; description?: string; category?: string }) {
    await this.findById(id); // throws if not found
    return this.prisma.sopDocument.update({
      where: { id },
      data: { ...data, updated_at: new Date() },
    });
  }

  async remove(id: string) {
    const doc = await this.findById(id);
    // Delete physical file
    const fullPath = path.resolve(this.uploadDir, doc.file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`Deleted SOP file: ${fullPath}`);
    }
    await this.prisma.sopDocument.delete({ where: { id } });
    return { message: 'SOP document deleted' };
  }

  async getFilePath(id: string): Promise<string> {
    const doc = await this.findById(id);
    const fullPath = path.resolve(this.uploadDir, doc.file_path);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('SOP file not found on disk');
    }
    return fullPath;
  }
}
