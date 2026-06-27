import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Response } from 'express';
import { SopService } from './sop.service';
import { SopAgentService } from './sop-agent.service';
import { SopIndexerService } from '../ai/sop-indexer.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

/**
 * SOP Document Controller
 *
 * Provides REST API endpoints for managing SOP PDF documents.
 * Files are stored on disk in a persistent directory (survives VPS restarts).
 *
 * Endpoints:
 *   POST   /sop/upload        — Upload single PDF
 *   POST   /sop/upload-bulk   — Upload multiple PDFs
 *   GET    /sop               — List all SOP documents
 *   GET    /sop/:id           — Get SOP metadata
 *   GET    /sop/:id/file      — Download/view PDF file
 *   PUT    /sop/:id           — Update SOP metadata (title, description, category)
 *   DELETE /sop/:id           — Delete SOP document and file
 */
@Controller('sop')
export class SopController {
  constructor(
    private readonly sopService: SopService,
    private readonly sopAgent: SopAgentService,
    private readonly sopIndexer: SopIndexerService,
  ) {}

  private getMulterStorage() {
    return diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, this.sopService.getUploadDir());
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || '.pdf';
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
      },
    });
  }

  /**
   * Upload a single SOP PDF
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = process.env.SOP_UPLOAD_DIR ||
            path.resolve(process.cwd(), 'uploads', 'sop');
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || '.pdf';
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; description?: string; category?: string },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const title = body.title || path.basename(file.originalname, path.extname(file.originalname));
    const doc = await this.sopService.create({
      title,
      description: body.description || null,
      category: body.category || null,
      file_name: file.originalname,
      file_path: file.filename,
      file_size: file.size,
      mime_type: file.mimetype,
    });

    // Emit event via SOP Agent
    await this.sopAgent.emitDocumentUploaded({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      file_name: doc.file_name,
      file_size: doc.file_size,
    });

    // Index for AI RAG (async, non-blocking)
    this.sopIndexer.indexDocument(doc.id).catch(() => {});

    return { success: true, data: doc };
  }

  /**
   * Upload multiple SOP PDFs (bulk)
   */
  @Post('upload-bulk')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = process.env.SOP_UPLOAD_DIR ||
            path.resolve(process.cwd(), 'uploads', 'sop');
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname) || '.pdf';
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadBulk(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { category?: string },
  ) {
    if (!files || files.length === 0) throw new BadRequestException('No files uploaded');

    const docs = files.map((file) => ({
      title: path.basename(file.originalname, path.extname(file.originalname)),
      description: null,
      category: body.category || null,
      file_name: file.originalname,
      file_path: file.filename,
      file_size: file.size,
      mime_type: file.mimetype,
    }));

    const created = await this.sopService.createMany(docs);

    // Emit bulk event via SOP Agent
    await this.sopAgent.emitBulkUploaded(
      created.map((d: any) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        file_name: d.file_name,
        file_size: d.file_size,
      })),
    );

    for (const doc of created) {
      this.sopIndexer.indexDocument(doc.id).catch(() => {});
    }

    return { success: true, data: created, count: created.length };
  }

  /**
   * List all SOP documents
   */
  @Get()
  async findAll() {
    const docs = await this.sopService.findAll();
    return { success: true, data: docs };
  }

  /**
   * Get SOP metadata by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const doc = await this.sopService.findById(id);
    return { success: true, data: doc };
  }

  /**
   * Serve the PDF file for viewing/download
   */
  @Get(':id/file')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.sopService.findById(id);
    const filePath = await this.sopService.getFilePath(id);

    // Track view event via SOP Agent
    await this.sopAgent.emitDocumentViewed({
      id: doc.id,
      title: doc.title,
      category: doc.category,
    });

    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
    res.sendFile(filePath);
  }

  /**
   * Update SOP metadata
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; category?: string },
  ) {
    const doc = await this.sopService.update(id, body);

    // Emit update event via SOP Agent
    await this.sopAgent.emitDocumentUpdated(
      { id: doc.id, title: doc.title, category: doc.category },
      body,
    );

    this.sopIndexer.indexDocument(doc.id).catch(() => {});

    return { success: true, data: doc };
  }

  /**
   * Delete SOP document and its file
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    // Get doc metadata before deletion for the event
    const doc = await this.sopService.findById(id);
    const result = await this.sopService.remove(id);

    // Emit delete event via SOP Agent
    await this.sopAgent.emitDocumentDeleted({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      file_name: doc.file_name,
    });

    await this.sopIndexer.removeDocumentIndex(doc.id).catch(() => {});

    return { success: true, ...result };
  }
}
