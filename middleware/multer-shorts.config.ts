import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

const maxUploadMb = Math.min(
  2048,
  Math.max(100, Number(process.env.SHORTS_MAX_UPLOAD_MB || 500) || 500),
);

/**
 * Multer config for Shorts upload - uses disk storage to avoid RAM spikes.
 * We stream files from disk to R2 (uploadFileFromPath).
 * Default 500MB (override SHORTS_MAX_UPLOAD_MB) — long HD reels exceed 100MB.
 */
export const multerShortsOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '') || '';
      cb(null, `eatix-short-${uuidv4()}${ext}`);
    },
  }),
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
