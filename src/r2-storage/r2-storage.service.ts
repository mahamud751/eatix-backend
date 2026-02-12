import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>(
      'CLOUDFLARE_ACCESS_KEY_ID',
    );
    const secretAccessKey = this.configService.get<string>(
      'CLOUDFLARE_SECRET_ACCESS_KEY',
    );
    this.bucketName = this.configService.get<string>('CLOUDFLARE_BUCKET_NAME');
    this.publicUrl = this.configService.get<string>('CLOUDFLARE_PUBLIC_URL');

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Upload file to R2
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'videos',
  ): Promise<{ url: string; key: string }> {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${fileName}`;

      this.logger.log(`File uploaded successfully: ${fileName}`);
      return { url, key: fileName };
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      this.logger.error(`Error uploading file: ${msg}`);
      throw new Error(`R2 upload failed: ${msg}`);
    }
  }

  /**
   * Upload buffer to R2
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'videos',
  ): Promise<{ url: string; key: string }> {
    try {
      const key = `${folder}/${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${key}`;

      this.logger.log(`Buffer uploaded successfully: ${key}`);
      return { url, key };
    } catch (error) {
      this.logger.error(`Error uploading buffer: ${error.message}`);
      throw new Error('Failed to upload buffer to R2');
    }
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`);
      throw new Error('Failed to delete file from R2');
    }
  }

  /**
   * Get signed URL for private access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`Error generating signed URL: ${error.message}`);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Get public URL
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
