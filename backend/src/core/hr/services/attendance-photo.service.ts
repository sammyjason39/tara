import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB

@Injectable()
export class AttendancePhotoService {
  private readonly logger = new Logger(AttendancePhotoService.name);
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir =
      process.env.ATTENDANCE_PHOTO_DIR ||
      path.resolve(process.cwd(), 'uploads', 'attendance');
  }

  /**
   * Save a base64 or data-URL JPEG selfie. Returns a relative path stored in DB.
   */
  async saveSelfie(
    employeeId: string,
    attendanceDate: Date,
    type: 'in' | 'out',
    photoBase64: string,
  ): Promise<string> {
    if (!photoBase64?.trim()) {
      throw new BadRequestException('Foto selfie wajib untuk absensi via HP');
    }

    const { buffer, ext } = this.decodePhoto(photoBase64);

    if (buffer.length > MAX_PHOTO_BYTES) {
      throw new BadRequestException(
        'Foto terlalu besar. Maksimal 2 MB.',
      );
    }

    const dateKey = attendanceDate.toISOString().slice(0, 10);
    const dir = path.join(this.uploadDir, employeeId);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${dateKey}-${type}.${ext}`;
    const absolutePath = path.join(dir, filename);
    await fs.writeFile(absolutePath, buffer);

    const relativePath = path.join('attendance', employeeId, filename);
    this.logger.log(`Saved attendance selfie: ${relativePath}`);
    return relativePath;
  }

  private decodePhoto(input: string): { buffer: Buffer; ext: string } {
    const trimmed = input.trim();
    const dataUrlMatch = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i.exec(
      trimmed,
    );

    let base64Payload: string;
    let ext = 'jpg';

    if (dataUrlMatch) {
      ext = dataUrlMatch[1].toLowerCase() === 'png' ? 'png' : 'jpg';
      base64Payload = dataUrlMatch[2];
    } else {
      base64Payload = trimmed.replace(/^data:.*;base64,/, '');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Payload, 'base64');
    } catch {
      throw new BadRequestException('Format foto tidak valid');
    }

    if (buffer.length < 100) {
      throw new BadRequestException('Foto tidak valid atau kosong');
    }

    return { buffer, ext };
  }
}
