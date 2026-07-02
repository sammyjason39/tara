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
  UseFilters,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';
import { SopService } from './sop.service';
import { SopAgentService } from './sop-agent.service';
import { SopIndexerService } from '../ai/sop-indexer.service';
import {
  createSopMulterOptions,
  isPdfUpload,
  resolveSopUploadDir,
  SOP_MAX_BULK_FILES,
} from './sop-upload.config';
import { MulterExceptionFilter } from './multer-exception.filter';

/**
 * SOP Document Controller
 *
 * Provides REST API endpoints for managing SOP PDF documents.
 * Files are stored on disk in a persistent directory (survives VPS restarts).
 */
@Controller('sop')
@UseFilters(MulterExceptionFilter)
export class SopController {
  constructor(
    private readonly sopService: SopService,
    private readonly sopAgent: SopAgentService,
    private readonly sopIndexer: SopIndexerService,
  ) {}

  /**
   * Upload a single SOP PDF
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', createSopMulterOptions(resolveSopUploadDir(), 1)),
  )
  async uploadSingle(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title?: string; description?: string; category?: string },
  ) {
    if (!file) {
      throw new BadRequestException(
        'Tidak ada file yang diterima. Pastikan field upload bernama "file".',
      );
    }

    if (!isPdfUpload(file)) {
      await this.sopService.removeUploadedFile(file.filename);
      throw new BadRequestException('Hanya file PDF yang diperbolehkan');
    }

    const title =
      body.title?.trim() ||
      path.basename(file.originalname, path.extname(file.originalname));

    const doc = await this.sopService.create({
      title,
      description: body.description?.trim() || null,
      category: body.category?.trim() || null,
      file_name: file.originalname,
      file_path: file.filename,
      file_size: file.size,
      mime_type: 'application/pdf',
    });

    await this.sopAgent.emitDocumentUploaded({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      file_name: doc.file_name,
      file_size: doc.file_size,
    });

    this.sopIndexer.indexDocument(doc.id).catch(() => {});

    return { success: true, data: doc };
  }

  /**
   * Upload multiple SOP PDFs (bulk)
   */
  @Post('upload-bulk')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor(
      'files',
      SOP_MAX_BULK_FILES,
      createSopMulterOptions(resolveSopUploadDir(), SOP_MAX_BULK_FILES),
    ),
  )
  async uploadBulk(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { category?: string },
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Tidak ada file yang diterima. Pastikan field upload bernama "files".',
      );
    }

    const invalid = files.find((f) => !isPdfUpload(f));
    if (invalid) {
      for (const f of files) {
        await this.sopService.removeUploadedFile(f.filename);
      }
      throw new BadRequestException(
        `Hanya file PDF yang diperbolehkan: ${invalid.originalname}`,
      );
    }

    const docs = files.map((file) => ({
      title: path.basename(file.originalname, path.extname(file.originalname)),
      description: null,
      category: body.category?.trim() || null,
      file_name: file.originalname,
      file_path: file.filename,
      file_size: file.size,
      mime_type: 'application/pdf' as const,
    }));

    const created = await this.sopService.createMany(docs);

    await this.sopAgent.emitBulkUploaded(
      created.map((d) => ({
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

  @Get()
  async findAll() {
    const docs = await this.sopService.findAll();
    return { success: true, data: docs };
  }

  @Get(':id/file')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.sopService.findById(id);
    const filePath = await this.sopService.getFilePath(id);

    await this.sopAgent.emitDocumentViewed({
      id: doc.id,
      title: doc.title,
      category: doc.category,
    });

    res.setHeader('Content-Type', doc.mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.file_name}"`);
    res.sendFile(filePath);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const doc = await this.sopService.findById(id);
    return { success: true, data: doc };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; category?: string },
  ) {
    const doc = await this.sopService.update(id, body);

    await this.sopAgent.emitDocumentUpdated(
      { id: doc.id, title: doc.title, category: doc.category },
      body,
    );

    this.sopIndexer.indexDocument(doc.id).catch(() => {});

    return { success: true, data: doc };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    const doc = await this.sopService.findById(id);
    const result = await this.sopService.remove(id);

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
