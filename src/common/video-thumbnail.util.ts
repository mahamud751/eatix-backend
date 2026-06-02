import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

function ffmpegBin(): string {
  return process.env.FFMPEG_BIN?.trim() || 'ffmpeg';
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegBin(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr?.on('data', (d) => {
      err += String(d);
    });
    proc.on('error', (e) => reject(e));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim() || `ffmpeg exited ${code}`));
    });
  });
}

async function unlinkQuiet(p: string | null | undefined) {
  if (!p) return;
  try {
    await fs.unlink(p);
  } catch {
    /* noop */
  }
}

/** Write multer memory upload to a temp file when needed for ffmpeg. */
export async function resolveMulterVideoPath(
  file: Express.Multer.File,
): Promise<{ path: string; cleanup: boolean }> {
  if (file?.path) {
    return { path: file.path, cleanup: false };
  }
  if (file?.buffer?.length) {
    const ext = path.extname(file.originalname || '') || '.mp4';
    const p = path.join(os.tmpdir(), `eatix-vid-in-${uuidv4()}${ext}`);
    await fs.writeFile(p, file.buffer);
    return { path: p, cleanup: true };
  }
  throw new Error('Video file has no path or buffer');
}

/**
 * Extract a JPEG frame from a video file (first successful timestamp wins).
 */
export async function extractVideoThumbnailFromPath(
  videoPath: string,
  timeOffsetsSec: number[] = [0.5, 1, 2, 3],
): Promise<Buffer> {
  const normalized = String(videoPath || '').trim();
  if (!normalized) {
    throw new Error('Video path is required for thumbnail extraction');
  }

  let lastError: Error | null = null;
  for (const sec of timeOffsetsSec) {
    let outPath = '';
    try {
      outPath = path.join(os.tmpdir(), `eatix-thumb-${uuidv4()}.jpg`);
      await runFfmpeg([
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        String(Math.max(0, sec)),
        '-i',
        normalized,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        '-y',
        outPath,
      ]);
      const buf = await fs.readFile(outPath);
      if (buf.length > 0) return buf;
      lastError = new Error('Empty thumbnail file');
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    } finally {
      await unlinkQuiet(outPath);
    }
  }
  throw lastError || new Error('Could not extract video thumbnail');
}

export async function extractVideoThumbnailFromMulterFile(
  file: Express.Multer.File,
): Promise<Buffer> {
  const { path: videoPath, cleanup } = await resolveMulterVideoPath(file);
  try {
    return await extractVideoThumbnailFromPath(videoPath);
  } finally {
    if (cleanup) await unlinkQuiet(videoPath);
  }
}

export function multerFileFromBuffer(
  buffer: Buffer,
  originalname = 'thumbnail.jpg',
  mimetype = 'image/jpeg',
): Express.Multer.File {
  return {
    fieldname: 'files',
    originalname,
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    buffer,
    destination: '',
    filename: originalname,
    path: undefined as unknown as string,
    stream: undefined as unknown as NodeJS.ReadableStream,
  };
}
