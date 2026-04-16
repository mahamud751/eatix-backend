import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
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
   * Create a presigned PUT URL for direct client upload to R2.
   */
  async createPresignedPutUrl(params: {
    folder?: string;
    originalName: string;
    mimeType: string;
    expiresInSec?: number;
  }): Promise<{ key: string; putUrl: string; publicUrl: string }> {
    const folder = (params.folder || 'uploads').replace(/\/+$/, '');
    const ext = String(params.originalName || 'file.bin')
      .split('.')
      .pop();
    const safeExt = ext && /^[a-z0-9]{1,8}$/i.test(ext) ? ext : 'bin';
    const key = `${folder}/${uuidv4()}.${safeExt}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: params.mimeType || 'application/octet-stream',
    });
    const putUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: Math.max(60, Math.min(3600, Number(params.expiresInSec || 900))),
    });
    return { key, putUrl, publicUrl: `${this.publicUrl}/${key}` };
  }

  /**
   * Download an R2 object to a local file path.
   */
  async downloadToFile(key: string, outPath: string): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    const res = await this.s3Client.send(command);
    // AWS SDK v3 returns Body as a stream in Node.
    const body: any = res.Body;
    if (!body || typeof body.pipe !== 'function') {
      throw new Error('R2 download failed: empty body');
    }
    await pipeline(body, createWriteStream(outPath));
  }

  /**
   * Upload a local file path to R2 (streaming; avoids buffering huge uploads in RAM).
   */
  async uploadFileFromPath(
    filePath: string,
    originalName: string,
    mimeType: string,
    folder: string = 'videos',
  ): Promise<{ url: string; key: string }> {
    try {
      const fileExtension = String(originalName || 'file.bin')
        .split('.')
        .pop();
      const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: createReadStream(filePath),
        ContentType: mimeType || 'application/octet-stream',
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${fileName}`;
      this.logger.log(`File uploaded successfully: ${fileName}`);
      return { url, key: fileName };
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      this.logger.error(`Error uploading file (path): ${msg}`);
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
