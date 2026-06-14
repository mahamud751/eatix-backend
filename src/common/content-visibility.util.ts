import { NotFoundException } from '@nestjs/common';
import {
  haversineKm,
  isValidCoord,
  resolveOwnerAreaKm,
  type OwnerAreaFields,
} from './geo.util';

export type ContentViewerRole =
  | 'user'
  | 'owner'
  | 'vendor'
  | 'admin'
  | 'superadmin'
  | string;

export type CreatorRoleFields = OwnerAreaFields & {
  role?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function normalizeViewerRole(role?: string | null): string {
  return String(role || 'user').toLowerCase();
}

/**
 * Role visibility:
 * - user: never see vendor content
 * - owner: see owners, users, vendors (area handled separately)
 * - vendor: see all roles
 * - admin: see all
 */
export function canViewerSeeCreatorContent(
  viewerRole: string | undefined | null,
  creatorRole: string | undefined | null,
): boolean {
  const viewer = normalizeViewerRole(viewerRole);
  const creator = normalizeViewerRole(creatorRole);

  if (viewer === 'user' && creator === 'vendor') return false;
  if (viewer === 'vendor') return true;
  if (viewer === 'admin' || viewer === 'superadmin') return true;
  return true;
}

/** Prisma filter on content author's role for list feeds. */
export function creatorRoleWhereForViewer(viewerRole?: string | null) {
  const viewer = normalizeViewerRole(viewerRole);
  if (viewer === 'user') {
    return { role: { not: 'vendor' as const } };
  }
  return undefined;
}

export function assertViewerCanSeeCreatorContent(
  viewerRole: string | undefined | null,
  creatorRole: string | undefined | null,
  message = 'Content not found',
): void {
  if (!canViewerSeeCreatorContent(viewerRole, creatorRole)) {
    throw new NotFoundException(message);
  }
}

/**
 * Nearby / profile reach:
 * - vendor viewers: no creator content-area cap (see all within feed radius)
 * - others: min(feedRadius, creator content area)
 */
export function effectiveNearbyRadiusKm(
  viewerRole: string | undefined | null,
  creator: CreatorRoleFields,
  radiusKm: number,
): number {
  const viewer = normalizeViewerRole(viewerRole);
  if (viewer === 'vendor') return radiusKm;
  const ownerMaxKm = resolveOwnerAreaKm(creator, 'content');
  return ownerMaxKm != null ? Math.min(radiusKm, ownerMaxKm) : radiusKm;
}

/**
 * Whether viewer may see a creator's content considering role + content area.
 * Vendor viewers skip area limits (see all creators).
 */
export function isCreatorVisibleToViewer(
  viewerRole: string | undefined | null,
  viewerLat: number | null | undefined,
  viewerLng: number | null | undefined,
  creator: CreatorRoleFields,
): boolean {
  if (!canViewerSeeCreatorContent(viewerRole, creator.role)) return false;

  const viewer = normalizeViewerRole(viewerRole);
  if (viewer === 'vendor') return true;

  if (
    !isValidCoord(creator.latitude) ||
    !isValidCoord(creator.longitude)
  ) {
    return true;
  }

  const maxKm = resolveOwnerAreaKm(creator, 'content');
  if (maxKm == null) return true;

  if (!isValidCoord(viewerLat) || !isValidCoord(viewerLng)) {
    return false;
  }

  return (
    haversineKm(
      viewerLat!,
      viewerLng!,
      creator.latitude!,
      creator.longitude!,
    ) <= maxKm
  );
}
