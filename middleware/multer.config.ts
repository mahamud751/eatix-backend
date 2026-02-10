import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';

// Define the Multer options
export const multerOptions: MulterOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/uploads'); // Use relative path
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    },
  }),
  fileFilter: (req, file, cb) => {
    const supportedFiles =
      /\.(jpg|jpeg|png|pdf|docx|xlsx|xls|doc|mp4|mov|avi|zip|rar|mp3|m4a|aac|wav|ogg|opus|3gp)$/i;
    if (supportedFiles.test(extname(file.originalname))) {
      cb(null, true); // Accept the file
    } else {
      cb(
        new BadRequestException(
          'Invalid file type. Supported types: jpg, jpeg, png, pdf, docx, xlsx, xls, doc, mp4, mov, avi, zip, rar, mp3, m4a, aac, wav, ogg, opus, 3gp',
        ),
        false,
      ); // Reject the file
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB size limit
  },
};
