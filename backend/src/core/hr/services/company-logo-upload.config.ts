import { memoryStorage, type Options } from 'multer';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function createLogoMulterOptions(): Options {
  return {
    storage: memoryStorage(),
    limits: { fileSize: MAX_LOGO_BYTES, files: 1 },
  };
}
