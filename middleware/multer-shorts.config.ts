import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

/**
 * Multer config for Shorts upload - uses memory storage for Cloudflare R2
 * R2 upload requires file.buffer, so we use memoryStorage (not diskStorage)
 * Max 100MB for shorts (3 min video)
 */
export const multerShortsOptions: MulterOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB for shorts
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
