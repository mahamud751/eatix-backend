export type DiscountTier = {
  minValue: number;
  maxValue?: number | null;
  percent: number;
  metricType?: 'amount' | 'people';
  benefit?: 'free_tax_charge';
};

export const PROMO_BENEFITS = {
  FREE_TAX_CHARGE: 'free_tax_charge',
} as const;

export function isPromotionActive(promo: {
  startDate: Date | string;
  expireDate: Date | string;
}): boolean {
  const now = new Date();
  const start = new Date(promo.startDate);
  const end = new Date(promo.expireDate);
  return start <= now && end >= now;
}

export function matchesFulfillmentScope(
  scopes: string[] | undefined | null,
  fulfillmentType: 'collection' | 'delivery',
): boolean {
  if (!scopes || scopes.length === 0) return true;
  const ft = fulfillmentType === 'collection' ? 'collection' : 'delivery';
  if (scopes.includes('both')) return true;
  return scopes.includes(ft);
}

export function findMatchingTierInList(
  tiers: DiscountTier[] | null | undefined,
  value: number,
  metricType: 'amount' | 'people' = 'amount',
): DiscountTier | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  const v = Number(value);
  if (!Number.isFinite(v)) return null;

  const sorted = [...tiers]
    .filter((t) => {
      const mt = (t.metricType || metricType) as string;
      return mt === metricType;
    })
    .sort((a, b) => Number(b.minValue) - Number(a.minValue));

  for (const tier of sorted) {
    const min = Number(tier.minValue);
    const max =
      tier.maxValue != null && String(tier.maxValue) !== ''
        ? Number(tier.maxValue)
        : null;
    if (!Number.isFinite(min)) continue;
    if (v >= min && (max == null || !Number.isFinite(max) || v <= max)) {
      return tier;
    }
  }
  return null;
}

export function findMatchingTier(
  tiers: DiscountTier[] | null | undefined,
  value: number,
  metricType: 'amount' | 'people' = 'amount',
): DiscountTier | null {
  return findMatchingTierInList(
    parsePercentDiscountTiers(tiers),
    value,
    metricType,
  );
}

export function calcPercentDiscount(amount: number, percent: number): number {
  const base = Number(amount);
  const pct = Number(percent);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(pct) || pct <= 0) {
    return 0;
  }
  return Math.round(((base * pct) / 100) * 100) / 100;
}

export function parsePromotionTiers(raw: unknown): DiscountTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => ({
      minValue: Number((t as DiscountTier)?.minValue),
      maxValue:
        (t as DiscountTier)?.maxValue != null
          ? Number((t as DiscountTier).maxValue)
          : null,
      percent: Number((t as DiscountTier)?.percent),
      metricType: (t as DiscountTier)?.metricType as
        | 'amount'
        | 'people'
        | undefined,
      benefit:
        (t as DiscountTier)?.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE
          ? PROMO_BENEFITS.FREE_TAX_CHARGE
          : undefined,
    }))
    .filter(
      (t) =>
        Number.isFinite(t.minValue) &&
        ((Number.isFinite(t.percent) && t.percent > 0) ||
          t.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE),
    );
}

export function parsePercentDiscountTiers(raw: unknown): DiscountTier[] {
  return parsePromotionTiers(raw).filter(
    (t) => t.benefit !== PROMO_BENEFITS.FREE_TAX_CHARGE,
  );
}

export function parseDiscountTiers(raw: unknown): DiscountTier[] {
  return parsePercentDiscountTiers(raw);
}

export function getFreeTaxChargeTier(
  tiers: DiscountTier[] | null | undefined,
  itemsSubtotal: number,
): DiscountTier | null {
  return findMatchingTierInList(
    parsePromotionTiers(tiers).filter(
      (t) => t.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE,
    ),
    itemsSubtotal,
    'amount',
  );
}
