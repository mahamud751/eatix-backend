/**
 * FFmpeg video filters aligned with app `filterEffects.js` filter ids.
 * Keeps look close to client overlays; baked into pixels on upload.
 */

/** eq / hue approximations per filter id (none + FILTER_EFFECTS ids) */
const FILTER_VF: Record<string, string> = {
  none: '',
  '1': 'eq=saturation=0.92:contrast=1.06:brightness=0.02',
  '2': 'eq=saturation=1.18:brightness=0.04:gamma=1.02',
  '3': 'eq=saturation=0.88:gamma=1.05',
  '4': 'eq=saturation=1.1:contrast=1.12:brightness=-0.03',
  '5': 'eq=saturation=0.85:contrast=1.15:brightness=-0.04',
  '6': 'eq=saturation=1.05:brightness=0.06',
  '7': 'eq=saturation=0.9:contrast=1.2:brightness=-0.05',
  '8': 'eq=saturation=1.12:gamma=0.98',
  '9': 'eq=saturation=0.95:brightness=0.05:gamma=1.03',
  '10': 'hue=s=0,eq=contrast=1.22:brightness=-0.02',
  '11': 'hue=s=0',
  '12': 'hue=s=0,eq=contrast=1.08',
  '13': 'hue=h=15:s=1.08,eq=contrast=1.05:brightness=0.02',
  '14': 'hue=h=-18:s=0.92,eq=gamma=1.05:brightness=-0.01',
  '15': 'eq=saturation=1.35:contrast=1.12:brightness=0.01',
  '16': 'eq=saturation=0.75:contrast=0.95:brightness=0.04',
  '17': 'hue=s=0,eq=contrast=1.28:brightness=-0.03',
  '18': 'eq=saturation=1.1:brightness=0.04:gamma=0.98',
  '19': 'eq=saturation=0.82:contrast=1.16:brightness=-0.035',
  '20': 'eq=saturation=1.0:contrast=1.2:gamma=0.92',
};

/** When the app sends a filter id not in FILTER_VF (e.g. CMS-only), still run a mild grade so output is re-encoded, not a raw copy. */
const FILTER_FALLBACK_VF =
  'eq=saturation=1.06:contrast=1.04:brightness=0.005';

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
  const id = opts.filterId != null ? String(opts.filterId) : 'none';
  const preset = FILTER_VF[id];
  if (preset) parts.push(preset);
  else if (id && id !== 'none') parts.push(FILTER_FALLBACK_VF);
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
