import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

const maxUploadMb = Math.min(
  2048,
  Math.max(100, Number(process.env.SHORTS_MAX_UPLOAD_MB || 500) || 500),
);

/**
 * Multer config for Shorts upload - uses memory storage for Cloudflare R2
 * R2 upload requires file.buffer, so we use memoryStorage (not diskStorage)
 * Default 500MB (override SHORTS_MAX_UPLOAD_MB) — long HD reels exceed 100MB.
 */
export const multerShortsOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: maxUploadMb * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');
    if (isVideo || isImage) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          'Invalid file. Shorts accept video (mp4, mov, etc.) and image (thumbnail)',
        ),
        false,
      );
    }
  },
};
