import { BadRequestException } from '@nestjs/common';

export type VendorOrderQtyLimits = {
  min: number | null;
  max: number | null;
};

export function resolveVendorOrderQtyLimits(
  role: string | null | undefined,
  vendorMinOrderQty: number | null | undefined,
  vendorMaxOrderQty: number | null | undefined,
): VendorOrderQtyLimits | null {
  if (String(role || '').toLowerCase() !== 'vendor') return null;

  const min =
    vendorMinOrderQty != null && vendorMinOrderQty > 0
      ? Math.floor(vendorMinOrderQty)
      : null;
  const max =
    vendorMaxOrderQty != null && vendorMaxOrderQty > 0
      ? Math.floor(vendorMaxOrderQty)
      : null;

  if (min == null && max == null) return null;
  if (min != null && max != null && min > max) {
    throw new BadRequestException(
      'Vendor order limits are misconfigured: minimum cannot exceed maximum.',
    );
  }

  return { min, max };
}

export function assertVendorItemQuantities(
  items: { menuItemId: string; quantity: number }[],
  menuItems: { id: string; itemName: string }[],
  limits: VendorOrderQtyLimits | null,
): void {
  if (!limits) return;

  const nameById = new Map(menuItems.map((m) => [m.id, m.itemName || 'Item']));

  for (const item of items) {
    const qty = Math.floor(Number(item.quantity) || 0);
    const name = nameById.get(item.menuItemId) || 'Item';

    if (limits.min != null && qty < limits.min) {
      throw new BadRequestException(
        `${name}: minimum order quantity is ${limits.min}. You selected ${qty}.`,
      );
    }
    if (limits.max != null && qty > limits.max) {
      throw new BadRequestException(
        `${name}: maximum order quantity is ${limits.max}. You selected ${qty}.`,
      );
    }
  }
}
