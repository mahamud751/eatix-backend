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
    let subtitlesAssPath: string | null = null;
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
      const videoMeta = await this.probeVideoMeta(inPath);
      if (
        Array.isArray(dto.overlayItems) &&
        dto.overlayItems.some((x) => String(x?.text || '').trim())
      ) {
        subtitlesAssPath = path.join(os.tmpdir(), `eatix-sh-ass-${id}.ass`);
        const assDoc = this.buildAssFromOverlayItems({
          items: dto.overlayItems,
          width: videoMeta.width,
          height: videoMeta.height,
          durationSec: videoMeta.durationSec,
          trimStartSec: dto.trimStartSec,
          trimEndSec: dto.trimEndSec,
        });
        await fs.writeFile(subtitlesAssPath, assDoc, 'utf8');
      }
      const args = this.composeFfmpegArgs({
        inPath,
        outPath,
        soundPath,
        vf,
        speed,
        hasAudio,
        trimStartSec: dto.trimStartSec,
        trimEndSec: dto.trimEndSec,
        overlayText: dto.overlayText,
        overlayTextColor: dto.overlayTextColor,
        overlayTextSize: dto.overlayTextSize,
        overlayTextX: dto.overlayTextX,
        overlayTextY: dto.overlayTextY,
        overlayItems: dto.overlayItems,
        subtitlesAssPath,
        originalVolume: dto.originalVolume,
        musicVolume: dto.musicVolume,
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
      await unlinkQuiet(subtitlesAssPath ?? undefined);
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
    trimStartSec?: number;
    trimEndSec?: number;
    overlayText?: string;
    overlayTextColor?: string;
    overlayTextSize?: number;
    overlayTextX?: string;
    overlayTextY?: string;
    overlayItems?: Array<{
      text?: string;
      color?: string;
      size?: number;
      x?: string;
      y?: string;
      xPct?: number;
      yPct?: number;
      startSec?: number;
      endSec?: number;
      shadowPreset?: string;
    }>;
    subtitlesAssPath?: string | null;
    originalVolume?: number;
    musicVolume?: number;
  }): string[] {
    const {
      inPath,
      outPath,
      soundPath,
      vf,
      speed,
      hasAudio,
      trimStartSec,
      trimEndSec,
      overlayText,
      overlayTextColor,
      overlayTextSize,
      overlayTextX,
      overlayTextY,
      overlayItems,
      subtitlesAssPath,
      originalVolume,
      musicVolume,
    } = opts;
    const base = ['-y'];
    const trimArgs: string[] = [];
    const trimStart =
      trimStartSec != null && Number(trimStartSec) > 0
        ? Number(trimStartSec)
        : 0;
    const trimEnd =
      trimEndSec != null && Number(trimEndSec) > 0 ? Number(trimEndSec) : 0;
    if (trimStart > 0) {
      trimArgs.push('-ss', String(trimStart));
    }
    if (trimEnd > trimStart) {
      trimArgs.push('-to', String(trimEnd));
    }
    const useAss =
      subtitlesAssPath != null && String(subtitlesAssPath).trim().length > 0;
    const drawLayers = useAss ? [] : this.buildDrawtextLayers(overlayItems);
    const drawSingle =
      useAss || drawLayers.length > 0
        ? ''
        : this.buildDrawtext({
            text: overlayText,
            color: overlayTextColor,
            size: overlayTextSize,
            x: overlayTextX,
            y: overlayTextY,
          });
    const subFilter = useAss
      ? `subtitles=${this.escapePathForSubtitlesFilter(subtitlesAssPath!)}`
      : '';
    const vchain = [vf, subFilter, drawSingle, ...drawLayers]
      .filter(Boolean)
      .join(',');
    const ov = this.clampVolume(originalVolume, 1);
    const mv = this.clampVolume(musicVolume, 1);

    if (soundPath) {
      const needReencode =
        Boolean(vchain) ||
        Math.abs(speed - 1) > 0.001 ||
        Math.abs(ov - 1) > 0.001 ||
        Math.abs(mv - 1) > 0.001;
      if (!needReencode && !hasAudio) {
        return [
          ...base,
          ...trimArgs,
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
      const videoChain = vchain || `setpts=PTS/${speed}`;
      const audioMix = hasAudio
        ? `[0:a]volume=${ov.toFixed(3)}[a0];[1:a]volume=${mv.toFixed(3)}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[a]`
        : `[1:a]volume=${mv.toFixed(3)}[a]`;
      return [
        ...base,
        ...trimArgs,
        '-i',
        inPath,
        '-i',
        soundPath,
        '-filter_complex',
        `[0:v]${videoChain}[v];${audioMix}`,
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
        '-shortest',
        '-movflags',
        '+faststart',
        outPath,
      ];
    }

    if (Math.abs(speed - 1) > 0.001 && !hasAudio) {
      const videoChain = vchain || `setpts=PTS/${speed}`;
      return [
        ...base,
        ...trimArgs,
        '-i',
        inPath,
        '-vf',
        videoChain,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-an',
        '-movflags',
        '+faststart',
        outPath,
      ];
    }

    if (Math.abs(speed - 1) > 0.001 && hasAudio) {
      const atempo = buildAtempoChain(speed);
      const videoChain = vchain || `setpts=PTS/${speed}`;
      const aChain =
        Math.abs(ov - 1) > 0.001
          ? `${atempo},volume=${ov.toFixed(3)}`
          : atempo;
      return [
        ...base,
        ...trimArgs,
        '-i',
        inPath,
        '-filter_complex',
        `[0:v]${videoChain}[v];[0:a]${aChain}[a]`,
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

    if (vchain || vf) {
      const audioArgs = hasAudio
        ? Math.abs(ov - 1) > 0.001
          ? ['-af', `volume=${ov.toFixed(3)}`, '-c:a', 'aac', '-b:a', '192k']
          : ['-c:a', 'copy']
        : ['-an'];
      return [
        ...base,
        ...trimArgs,
        '-i',
        inPath,
        '-vf',
        vchain || vf,
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

  private async probeVideoMeta(inputPath: string): Promise<{
    width: number;
    height: number;
    durationSec: number;
  }> {
    return new Promise((resolve, reject) => {
      const p = spawn(
        'ffprobe',
        [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width,height',
          '-show_entries',
          'format=duration',
          '-of',
          'json',
          inputPath,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let out = '';
      p.stdout.on('data', (d: Buffer) => {
        out += d.toString();
      });
      p.on('error', () =>
        reject(new Error('ffprobe not found — install ffmpeg/ffprobe')),
      );
      p.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe exited ${code}`));
          return;
        }
        try {
          const j = JSON.parse(out) as {
            streams?: Array<{ width?: number; height?: number }>;
            format?: { duration?: string };
          };
          const w = Number(j.streams?.[0]?.width || 1080);
          const h = Number(j.streams?.[0]?.height || 1920);
          const dur = Number(j.format?.duration || 30);
          resolve({
            width: Number.isFinite(w) && w > 0 ? w : 1080,
            height: Number.isFinite(h) && h > 0 ? h : 1920,
            durationSec: Number.isFinite(dur) && dur > 0 ? dur : 30,
          });
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });
    });
  }

  private escapePathForSubtitlesFilter(filePath: string): string {
    const normalized = path.resolve(filePath).replace(/\\/g, '/');
    return normalized.replace(/:/g, '\\:');
  }

  private formatAssTime(sec: number): string {
    const s = Math.max(0, sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const whole = Math.floor(s % 60);
    const cs = Math.min(99, Math.round((s - Math.floor(s)) * 100));
    return `${h}:${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  private hexToAssPrimaryColour(hex: string): string {
    const h = String(hex || '')
      .replace('#', '')
      .trim()
      .toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(h)) return '&H00FFFFFF&';
    const r = h.slice(0, 2);
    const g = h.slice(2, 4);
    const b = h.slice(4, 6);
    return `&H00${b}${g}${r}&`;
  }

  private escapeAssText(raw: string): string {
    return raw
      .replace(/\\/g, '\\\\')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\n/g, '\\N');
  }

  private assShadowTags(preset?: string): string {
    const p = String(preset || 'soft').toLowerCase();
    if (p === 'none') return '\\bord0\\shad0';
    if (p === 'hard') return '\\bord4\\shad2\\3c&H000000&';
    return '\\bord2\\shad1\\3c&H000000&';
  }

  private parseOverlayPctFromExpr(
    axis: 'x' | 'y',
    expr?: string,
  ): number | null {
    if (!expr) return null;
    const s = String(expr);
    if (axis === 'x') {
      const m = s.match(/\(\s*([0-9.]+)\s*\*\s*\(w-text_w\)\s*\)/);
      return m ? Number(m[1]) : null;
    }
    const m = s.match(/\(\s*([0-9.]+)\s*\*\s*\(h-text_h\)\s*\)/);
    return m ? Number(m[1]) : null;
  }

  private buildAssFromOverlayItems(opts: {
    items: Array<{
      text?: string;
      color?: string;
      size?: number;
      x?: string;
      y?: string;
      xPct?: number;
      yPct?: number;
      startSec?: number;
      endSec?: number;
      rotateDeg?: number;
      shadowPreset?: string;
    }>;
    width: number;
    height: number;
    durationSec: number;
    trimStartSec?: number;
    trimEndSec?: number;
  }): string {
    const {
      items,
      width,
      height,
      durationSec,
      trimStartSec,
      trimEndSec,
    } = opts;
    const trimS =
      trimStartSec != null && Number(trimStartSec) > 0
        ? Number(trimStartSec)
        : 0;
    const trimE =
      trimEndSec != null && Number(trimEndSec) > trimS
        ? Number(trimEndSec)
        : durationSec;
    const header = [
      '[Script Info]',
      'ScriptType: v4.00+',
      `PlayResX: ${width}`,
      `PlayResY: ${height}`,
      'WrapStyle: 0',
      'ScaledBorderAndShadow: yes',
      '',
      '[V4+ Styles]',
      'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
      'Style: Default,DejaVu Sans,36,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,10,10,80,1',
      '',
      '[Events]',
      'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ];
    const lines: string[] = [...header];
    let layerOrder = 0;
    for (const item of items) {
      const text = String(item?.text || '').trim();
      if (!text) continue;
      const xPctRaw =
        item.xPct != null && Number.isFinite(Number(item.xPct))
          ? Number(item.xPct)
          : this.parseOverlayPctFromExpr('x', item.x) ?? 0.5;
      const yPctRaw =
        item.yPct != null && Number.isFinite(Number(item.yPct))
          ? Number(item.yPct)
          : this.parseOverlayPctFromExpr('y', item.y) ?? 0.78;
      const xPct = Math.max(0, Math.min(1, xPctRaw));
      const yPct = Math.max(0, Math.min(1, yPctRaw));
      const px = Math.round(width * xPct);
      const py = Math.round(height * yPct);
      const fs = Math.max(12, Math.min(96, Math.round(Number(item?.size || 36))));
      const ls = Number(item?.startSec ?? 0);
      const le = Number(item?.endSec ?? durationSec);
      const visStart = Math.max(ls, trimS);
      const visEnd = Math.min(le, trimE);
      const assStart = visStart - trimS;
      const assEnd = visEnd - trimS;
      if (assEnd <= assStart + 0.02) continue;
      const colour = this.hexToAssPrimaryColour(String(item?.color || '#FFFFFF'));
      const rot = Number(item?.rotateDeg || 0);
      const frz =
        Number.isFinite(rot) && Math.abs(rot) > 0.05
          ? `\\frz${(-rot).toFixed(2)}`
          : '';
      const shadow = this.assShadowTags(item?.shadowPreset);
      const tags = `{\\pos(${px},${py})\\fs${fs}\\c${colour}${frz}${shadow}}`;
      const escaped = this.escapeAssText(text);
      lines.push(
        `Dialogue: ${layerOrder},${this.formatAssTime(assStart)},${this.formatAssTime(assEnd)},Default,,0,0,0,,${tags}${escaped}`,
      );
      layerOrder += 1;
    }
    if (lines.length <= header.length) {
      lines.push(
        `Dialogue: 0,0:00:00.00,0:00:00.01,Default,,0,0,0,,{\\alpha&HFF&}.`,
      );
    }
    return `${lines.join('\n')}\n`;
  }

  private clampVolume(value: number | undefined, fallback: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(2, n));
  }

  private drawtextBoxSuffix(shadowPreset?: string): string {
    const p = String(shadowPreset || 'soft').toLowerCase();
    if (p === 'none') return ':box=0';
    if (p === 'hard')
      return ':box=1:boxcolor=black@0.55:boxborderw=10';
    return ':box=1:boxcolor=black@0.35:boxborderw=8';
  }

  private buildDrawtext(opts: {
    text?: string;
    color?: string;
    size?: number;
    x?: string;
    y?: string;
  }): string {
    const raw = String(opts.text || '').trim();
    if (!raw) return '';
    const escaped = raw
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/,/g, '\\,');
    const color = String(opts.color || '#FFFFFF').replace('#', '') || 'FFFFFF';
    const size = Math.max(10, Math.min(96, Number(opts.size || 30)));
    const x = String(opts.x || '(w-text_w)/2');
    const y = String(opts.y || '(h*0.78)');
    return `drawtext=text='${escaped}':fontcolor=${color}:fontsize=${size}:x=${x}:y=${y}${this.drawtextBoxSuffix('soft')}`;
  }

  private buildDrawtextLayers(
    items:
      | Array<{
          text?: string;
          color?: string;
          size?: number;
          x?: string;
          y?: string;
          startSec?: number;
          endSec?: number;
          shadowPreset?: string;
        }>
      | undefined,
  ): string[] {
    if (!Array.isArray(items) || items.length === 0) return [];
    return items
      .map((item) => {
        const text = String(item?.text || '').trim();
        if (!text) return '';
        const escaped = text
          .replace(/\\/g, '\\\\')
          .replace(/:/g, '\\:')
          .replace(/'/g, "\\'")
          .replace(/\[/g, '\\[')
          .replace(/\]/g, '\\]')
          .replace(/,/g, '\\,');
        const color = String(item?.color || '#FFFFFF').replace('#', '') || 'FFFFFF';
        const size = Math.max(10, Math.min(96, Number(item?.size || 30)));
        const x = String(item?.x || '(w-text_w)/2');
        const y = String(item?.y || '(h*0.78)');
        const start = Number(item?.startSec);
        const end = Number(item?.endSec);
        const enable =
          Number.isFinite(start) && Number.isFinite(end) && end > start
            ? `:enable='between(t,${Math.max(0, start).toFixed(3)},${Math.max(0, end).toFixed(3)})'`
            : '';
        const box = this.drawtextBoxSuffix(item?.shadowPreset);
        return `drawtext=text='${escaped}':fontcolor=${color}:fontsize=${size}:x=${x}:y=${y}${box}${enable}`;
      })
      .filter(Boolean);
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
