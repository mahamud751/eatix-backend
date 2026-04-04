import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { CreateShortDto } from './dto/shorts.dto';
import {
  buildAtempoChain,
  buildShortsVideoFilters,
  shortsShouldTranscode,
} from './shorts-ffmpeg-presets';

async function unlinkQuiet(p: string | null | undefined) {
  if (!p) return;
  try {
    await fs.unlink(p);
  } catch {
    /* noop */
  }
}

@Injectable()
export class ShortsTranscodeService {
  private readonly logger = new Logger(ShortsTranscodeService.name);

  constructor(private readonly http: HttpService) {}

  shouldProcess(dto: CreateShortDto): boolean {
    return shortsShouldTranscode(dto);
  }

  async process(videoBuffer: Buffer, dto: CreateShortDto): Promise<Buffer> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const inPath = path.join(os.tmpdir(), `eatix-sh-in-${id}.mp4`);
    const outPath = path.join(os.tmpdir(), `eatix-sh-out-${id}.mp4`);
    let soundPath: string | null = null;
    try {
      await this.assertFfmpegAvailable();
      await fs.writeFile(inPath, videoBuffer);
      if (dto.soundUrl?.trim()) {
        soundPath = await this.downloadSound(dto.soundUrl.trim(), id);
      }
      const speed =
        dto.speedFactor != null && dto.speedFactor > 0
          ? Number(dto.speedFactor)
          : 1;
      const vf = buildShortsVideoFilters({
        filterId: dto.filterId,
        beautyLevel: dto.beautyLevel,
        speedFactor: speed,
      });
      const hasAudio = await this.probeHasAudio(inPath);
      const args = this.composeFfmpegArgs({
        inPath,
        outPath,
        soundPath,
        vf,
        speed,
        hasAudio,
      });
      if (args.length === 0) {
        return videoBuffer;
      }
      await this.runFfmpeg(args);
      return await fs.readFile(outPath);
    } finally {
      await unlinkQuiet(inPath);
      await unlinkQuiet(outPath);
      await unlinkQuiet(soundPath);
    }
  }

  private async assertFfmpegAvailable(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const p = spawn('ffmpeg', ['-hide_banner', '-version'], {
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      let err = '';
      p.stderr?.on('data', (d: Buffer) => {
        err += d.toString();
      });
      p.on('error', () =>
        reject(
          new Error(
            'ffmpeg not found. Install ffmpeg and add it to PATH (e.g. brew install ffmpeg / apt install ffmpeg).',
          ),
        ),
      );
      p.on('close', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`ffmpeg -version failed: ${err || code}`)),
      );
    });
  }

  private async downloadSound(url: string, id: string): Promise<string> {
    const clean = url.split('?')[0].toLowerCase();
    const ext = clean.endsWith('.wav')
      ? '.wav'
      : clean.endsWith('.m4a')
        ? '.m4a'
        : '.mp3';
    const soundPath = path.join(os.tmpdir(), `eatix-sh-snd-${id}${ext}`);
    const res = await this.http.axiosRef.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 120_000,
      maxRedirects: 5,
    });
    await fs.writeFile(soundPath, Buffer.from(res.data as ArrayBuffer));
    return soundPath;
  }

  private async probeHasAudio(inputPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const p = spawn(
        'ffprobe',
        [
          '-v',
          'error',
          '-select_streams',
          'a',
          '-show_entries',
          'stream=codec_type',
          '-of',
          'csv=p=0',
          inputPath,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let out = '';
      p.stdout.on('data', (d: Buffer) => {
        out += d.toString();
      });
      p.on('error', () => resolve(false));
      p.on('close', (code) => {
        if (code !== 0) resolve(false);
        else resolve(out.trim().length > 0);
      });
    });
  }

  private composeFfmpegArgs(opts: {
    inPath: string;
    outPath: string;
    soundPath: string | null;
    vf: string;
    speed: number;
    hasAudio: boolean;
  }): string[] {
    const { inPath, outPath, soundPath, vf, speed, hasAudio } = opts;
    const base = ['-y'];

    if (soundPath) {
      const needReencode = Boolean(vf) || Math.abs(speed - 1) > 0.001;
      if (!needReencode) {
        return [
          ...base,
          '-i',
          inPath,
          '-i',
          soundPath,
          '-map',
          '0:v:0',
          '-map',
          '1:a:0',
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-shortest',
          '-movflags',
          '+faststart',
          outPath,
        ];
      }
      const vchain = vf || `setpts=PTS/${speed}`;
      return [
        ...base,
        '-i',
        inPath,
        '-i',
        soundPath,
        '-filter_complex',
        `[0:v]${vchain}[v]`,
        '-map',
        '[v]',
        '-map',
        '1:a:0',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
        '-movflags',
        '+faststart',
        outPath,
      ];
    }

    if (Math.abs(speed - 1) > 0.001 && hasAudio) {
      const vchain = vf || `setpts=PTS/${speed}`;
      const atempo = buildAtempoChain(speed);
      return [
        ...base,
        '-i',
        inPath,
        '-filter_complex',
        `[0:v]${vchain}[v];[0:a]${atempo}[a]`,
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
        outPath,
      ];
    }

    if (vf) {
      const audioArgs = hasAudio ? ['-c:a', 'copy'] : ['-an'];
      return [
        ...base,
        '-i',
        inPath,
        '-vf',
        vf,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        ...audioArgs,
        '-movflags',
        '+faststart',
        outPath,
      ];
    }

    return [];
  }

  private runFfmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d: Buffer) => {
        err += d.toString();
      });
      p.on('error', (e) =>
        reject(
          new Error(
            `ffmpeg spawn failed — install ffmpeg and ensure it is on PATH. ${e.message}`,
          ),
        ),
      );
      p.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-1200)}`));
      });
    });
  }
}
