import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { EmployeeBulkService } from '../services/employee-bulk.service';

const xlsxUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
    const ok =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname?.toLowerCase().endsWith('.xlsx');
    cb(ok ? null : new BadRequestException('Hanya file .xlsx yang diperbolehkan'), ok);
  },
};

@Controller('employees/bulk')
@UseGuards(JwtGuard, RolesGuard)
@Roles('SuperAdmin', 'HR_Admin')
export class EmployeeBulkController {
  constructor(private readonly bulkService: EmployeeBulkService) {}

  @Get('export')
  async exportEmployees(@Res() res: Response) {
    const buffer = await this.bulkService.exportWorkbook();
    const filename = `tara-karyawan-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', xlsxUploadOptions))
  async previewUpload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const data = await this.bulkService.previewUpload(file, req.user.sub);
    return { success: true, data };
  }

  @Post('apply')
  async applyBatch(@Body() body: { batch_id: string }, @Req() req: any) {
    if (!body?.batch_id) {
      throw new BadRequestException('batch_id wajib diisi');
    }
    const data = await this.bulkService.applyBatch(body.batch_id, req.user.sub);
    return { success: true, data };
  }
}
