import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { multerOptions } from '../../middleware/multer.config';

@ApiTags('chat-files')
@Controller('chat-files')
export class ChatFileController {
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload chat files' })
  @ApiBody({
    description: 'Upload multiple files for chat',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[]): Promise<{
    files: Array<{ filename: string; url: string; type: string }>;
  }> {
    // Handle case where no files are uploaded (all rejected by filter)
    if (!files || files.length === 0) {
      return { files: [] };
    }

    const uploadedFiles = files.map((file) => {
      // Determine file type based on extension
      const extension = file.originalname.split('.').pop()?.toLowerCase();
      let fileType = 'file';

      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        fileType = 'image';
      } else if (['pdf'].includes(extension)) {
        fileType = 'pdf';
      } else if (['doc', 'docx'].includes(extension)) {
        fileType = 'document';
      }

      return {
        filename: file.originalname,
        url: `/uploads/${file.filename}`,
        type: fileType,
      };
    });

    return { files: uploadedFiles };
  }
}
