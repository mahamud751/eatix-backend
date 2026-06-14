/** Great-circle distance in km (Haversine). */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function isValidCoord(n: unknown): n is number {
  const v = Number(n);
  return Number.isFinite(v);
}

export const UK_DEFAULT_RADIUS_KM = 15;

export type OwnerAreaType = 'content' | 'pickup' | 'delivery';

export type OwnerAreaFields = {
  contentAreaKm?: number | null;
  pickupAreaKm?: number | null;
  deliveryAreaKm?: number | null;
};

function positiveKm(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Resolve effective owner radius for content browse, pickup, or delivery. */
export function resolveOwnerAreaKm(
  owner: OwnerAreaFields,
  areaType: OwnerAreaType,
): number | null {
  if (areaType === 'content') {
    return (
      positiveKm(owner.contentAreaKm) ?? positiveKm(owner.deliveryAreaKm)
    );
  }
  if (areaType === 'pickup') {
    return (
      positiveKm(owner.pickupAreaKm) ??
      positiveKm(owner.contentAreaKm) ??
      positiveKm(owner.deliveryAreaKm)
    );
  }
  return positiveKm(owner.deliveryAreaKm);
}

export function isWithinOwnerAreaKm(
  ownerLat: number,
  ownerLng: number,
  userLat: number,
  userLng: number,
  owner: OwnerAreaFields,
  areaType: OwnerAreaType,
): boolean {
  const maxKm = resolveOwnerAreaKm(owner, areaType);
  if (maxKm == null) return true;
  return haversineKm(ownerLat, ownerLng, userLat, userLng) <= maxKm;
}

export type DeliveryTaxChargeTiers = {
  taxCharge0To10Km?: number | null;
  taxCharge11To20Km?: number | null;
  taxCharge21To30Km?: number | null;
};

/** Pick owner tax/charge by delivery distance tier (0-10, 11-20, 21-30 km). */
export function resolveTaxChargeForDistanceKm(
  distanceKm: number | null | undefined,
  tiers: DeliveryTaxChargeTiers,
): number {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return 0;
  const pick = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  if (distanceKm <= 10) return pick(tiers.taxCharge0To10Km);
  if (distanceKm <= 20) return pick(tiers.taxCharge11To20Km);
  if (distanceKm <= 30) return pick(tiers.taxCharge21To30Km);
  return pick(tiers.taxCharge21To30Km);
}
