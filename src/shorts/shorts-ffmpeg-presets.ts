/**
 * FFmpeg video filters aligned with app `filterEffects.js`.
 * Preview uses a semi-transparent color overlay; we bake the same blend into pixels
 * so the stored MP4 matches what users see (plus beauty/speed/sound elsewhere).
 */

/**
 * Same hex + opacity as `Ethics-app/src/constants/filterEffects.js` FILTER_EFFECTS.
 * Keep these in sync when changing in-app looks.
 */
const FILTER_OVERLAY: Record<string, { hex: string; opacity: number }> = {
  '1': { hex: '#8B7355', opacity: 0.25 },
  '2': { hex: '#FF8C42', opacity: 0.2 },
  '3': { hex: '#4A90D9', opacity: 0.2 },
  '4': { hex: '#2D1B4E', opacity: 0.3 },
  '5': { hex: '#1a1a2e', opacity: 0.35 },
  '6': { hex: '#FFFFFF', opacity: 0.15 },
  '7': { hex: '#2C1810', opacity: 0.4 },
  '8': { hex: '#5A8F5A', opacity: 0.12 },
  '9': { hex: '#F5E6D3', opacity: 0.2 },
  '10': { hex: '#1a1a1a', opacity: 0.5 },
  '11': { hex: '#808080', opacity: 0.45 },
  '12': { hex: '#6B6B6B', opacity: 0.5 },
  '13': { hex: '#C9A227', opacity: 0.22 },
  '14': { hex: '#2A9D8F', opacity: 0.22 },
  '15': { hex: '#E63946', opacity: 0.18 },
  '16': { hex: '#6D6875', opacity: 0.28 },
  '17': { hex: '#2B2B2B', opacity: 0.42 },
  '18': { hex: '#FFE5B4', opacity: 0.2 },
  '19': { hex: '#3D2C1E', opacity: 0.32 },
  '20': { hex: '#1A1A2E', opacity: 0.38 },
};

/** When `filterId` is unknown (e.g. CMS-only), still apply a mild grade so output is re-encoded. */
const FILTER_FALLBACK_VF =
  'eq=saturation=1.06:contrast=1.04:brightness=0.005';

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '').trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Matches RN preview: out = src * (1 - a) + overlayRGB * a (per channel, rgb24).
 */
function buildOverlayColorGrade(hex: string, opacity: number): string {
  const a = Math.min(1, Math.max(0, opacity));
  if (a <= 0) return '';
  const rgb = parseHexRgb(hex);
  if (!rgb) return '';
  const om = 1 - a;
  const ar = rgb.r * a;
  const ag = rgb.g * a;
  const ab = rgb.b * a;
  return [
    'format=rgb24',
    `geq=r='r(X,Y)*${om}+${ar}':g='g(X,Y)*${om}+${ag}':b='b(X,Y)*${om}+${ab}'`,
    'format=yuv420p',
  ].join(',');
}

export function shortsShouldTranscode(dto: {
  soundUrl?: string;
  beautyLevel?: number;
  speedFactor?: number;
  filterId?: string;
  trimStartSec?: number;
  trimEndSec?: number;
  /** Client-reported source duration (seconds); used to detect real trim vs full-range defaults. */
  duration?: number;
  overlayText?: string;
  overlayItems?: Array<{ text?: string }>;
  originalVolume?: number;
  musicVolume?: number;
  splitPoints?: number[];
  transitionId?: string;
  exportWidth?: number;
  exportHeight?: number;
  exportFps?: number;
}): boolean {
  if (process.env.SHORTS_DISABLE_FFMPEG === '1') return false;
  const sound = dto.soundUrl != null && String(dto.soundUrl).trim().length > 0;
  if (sound) return true;
  const beauty = dto.beautyLevel != null && Number(dto.beautyLevel) > 0;
  if (beauty) return true;
  const sp = dto.speedFactor != null ? Number(dto.speedFactor) : 1;
  if (sp > 0 && Math.abs(sp - 1) > 0.001) return true;
  const fid = dto.filterId != null ? String(dto.filterId).trim() : '';
  if (fid && fid !== 'none') return true;
  const trimStart = Number(dto.trimStartSec || 0);
  const trimEnd = Number(dto.trimEndSec || 0);
  const reportedDur = Number(dto.duration || 0);
  /** Trim only forces transcode when it actually shortens vs reported duration (client always sends trim range). */
  const trimCutsIn =
    trimStart > 0.08 ||
    (reportedDur > 1 &&
      trimEnd > 0 &&
      trimEnd < reportedDur - 0.12);
  if (trimCutsIn) return true;
  if (String(dto.overlayText || '').trim()) return true;
  if (
    Array.isArray(dto.overlayItems) &&
    dto.overlayItems.some((x) => String(x?.text || '').trim())
  ) {
    return true;
  }
  const ov = Number(dto.originalVolume ?? 1);
  if (Number.isFinite(ov) && Math.abs(ov - 1) > 0.001) return true;
  const mv = Number(dto.musicVolume ?? 1);
  if (Number.isFinite(mv) && Math.abs(mv - 1) > 0.001) return true;
  if (Array.isArray(dto.splitPoints) && dto.splitPoints.length > 0) return true;
  const tid = String(dto.transitionId || '').toLowerCase();
  if (tid && tid !== 'none') return true;
  const ew = Number(dto.exportWidth || 0);
  const eh = Number(dto.exportHeight || 0);
  if (ew > 0 && eh > 0) return true;
  const ef = Number(dto.exportFps || 0);
  if (Number.isFinite(ef) && ef > 0) return true;
  return false;
}

export function buildShortsVideoFilters(opts: {
  filterId?: string | null;
  beautyLevel?: number | null;
  speedFactor?: number | null;
}): string {
  const parts: string[] = [];
  const speed =
    opts.speedFactor != null && opts.speedFactor > 0 ? opts.speedFactor : 1;
  if (Math.abs(speed - 1) > 0.001) {
    parts.push(`setpts=PTS/${speed}`);
  }
  const id =
    opts.filterId != null ? String(opts.filterId).trim() : 'none';
  const overlay = id && id !== 'none' ? FILTER_OVERLAY[id] : undefined;
  if (overlay) {
    const grade = buildOverlayColorGrade(overlay.hex, overlay.opacity);
    if (grade) parts.push(grade);
  } else if (id && id !== 'none') {
    parts.push(FILTER_FALLBACK_VF);
  }
  const b = opts.beautyLevel != null ? Number(opts.beautyLevel) : 0;
  if (Number.isFinite(b) && b > 0) {
    const t = Math.min(100, Math.max(0, b)) / 100;
    const sigma = 0.12 + t * 2.8;
    parts.push(`gblur=sigma=${sigma.toFixed(2)}`);
    parts.push('unsharp=5:5:0.7:5:5:0.02');
  }
  return parts.filter(Boolean).join(',');
}

/** atempo must stay in (0.5, 2); chain for larger factors */
export function buildAtempoChain(factor: number): string {
  if (factor <= 0) return 'anull';
  const chain: string[] = [];
  let f = factor;
  while (f > 2 + 1e-6) {
    chain.push('atempo=2.0');
    f /= 2;
  }
  while (f < 0.5 - 1e-6) {
    chain.push('atempo=0.5');
    f /= 0.5;
  }
  chain.push(`atempo=${Math.min(2, Math.max(0.5, f)).toFixed(4)}`);
  return chain.join(',');
}
