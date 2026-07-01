import { BadRequestException } from '@nestjs/common';
import { diskStorage, type Options } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export const SOP_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB per file
export const SOP_MAX_BULK_FILES = 20;

const PDF_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
  'application/octet-stream',
]);

export function isPdfUpload(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.pdf') return true;
  const mime = (file.mimetype || '').toLowerCase();
  return PDF_MIME_TYPES.has(mime);
}

export function resolveSopUploadDir(): string {
  return process.env.SOP_UPLOAD_DIR || path.resolve(process.cwd(), 'uploads', 'sop');
}

export function ensureSopUploadDir(uploadDir = resolveSopUploadDir()): string {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
}

function sopDiskStorage(uploadDir: string) {
  return diskStorage({
    destination: (_req, _file, cb) => {
      try {
        cb(null, ensureSopUploadDir(uploadDir));
      } catch (err) {
        cb(err as Error, uploadDir);
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf';
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

export function createSopMulterOptions(
  uploadDir: string,
  maxCount = 1,
): Options {
  return {
    storage: sopDiskStorage(uploadDir),
    limits: {
      fileSize: SOP_MAX_FILE_SIZE_BYTES,
      files: maxCount,
      fieldSize: 2 * 1024 * 1024,
    },
    fileFilter: (_req, _file, cb) => {
      cb(null, true);
    },
  };
}
