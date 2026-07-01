import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MulterError } from 'multer';
import { SOP_MAX_FILE_SIZE_BYTES } from './sop-upload.config';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MulterExceptionFilter.name);

  catch(exception: MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let message = 'Gagal mengupload file';
    const maxMb = Math.round(SOP_MAX_FILE_SIZE_BYTES / (1024 * 1024));

    switch (exception.code) {
      case 'LIMIT_FILE_SIZE':
        message = `File terlalu besar. Maksimal ${maxMb} MB per file.`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Jumlah file melebihi batas upload.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Field upload tidak valid. Gunakan field "file" atau "files".';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Request upload terlalu kompleks.';
        break;
      default:
        message = exception.message || message;
    }

    this.logger.warn(`Multer error [${exception.code}]: ${exception.message}`);

    res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      error: 'Bad Request',
      code: exception.code,
    });
  }
}
