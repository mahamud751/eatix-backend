/** Normalize UK phone to local 0-prefixed digits. */
export function normalizeUkPhone(phone: string | undefined | null): string {
  let p = String(phone || '').replace(/[\s\-().]/g, '');
  if (!p) return '';
  if (p.startsWith('+44')) p = `0${p.slice(3)}`;
  else if (p.startsWith('0044')) p = `0${p.slice(4)}`;
  else if (p.startsWith('44') && p.length >= 12) p = `0${p.slice(2)}`;
  return p;
}

export function isValidUkPhone(phone: string | undefined | null): boolean {
  const p = normalizeUkPhone(phone);
  if (!p) return false;
  if (/^07\d{9}$/.test(p)) return true;
  if (/^0[1-9]\d{8,9}$/.test(p)) return true;
  return false;
}

/** Parse `Phone: 07...` line appended by the app for legacy API compatibility. */
export function extractPhoneFromDeliveryAddress(address: string): {
  deliveryAddress: string;
  phone?: string;
} {
  const lines = String(address || '').split('\n');
  const phoneIdx = lines.findIndex((l) => /^Phone:\s*/i.test(l.trim()));
  if (phoneIdx === -1) return { deliveryAddress: String(address || '').trim() };
  const phone = lines[phoneIdx].replace(/^Phone:\s*/i, '').trim();
  const rest = [...lines.slice(0, phoneIdx), ...lines.slice(phoneIdx + 1)]
    .join('\n')
    .trim();
  return { deliveryAddress: rest, phone: phone || undefined };
}
