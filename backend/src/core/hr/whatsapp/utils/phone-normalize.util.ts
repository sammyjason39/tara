/** Normalize phone to international digits without + (e.g. 6281234567890). */
export function normalizeWhatsAppPhone(phone: string): string {
  let normalized = phone.replace(/[\s\-\(\)]/g, '');
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }
  if (normalized.startsWith('08')) {
    normalized = '62' + normalized.substring(1);
  }
  return normalized;
}

/** Build lookup variants for matching inbound WA numbers against DB records. */
export function phoneLookupVariants(phone: string): string[] {
  const stripped = phone.replace(/[\s\-\(\)]/g, '');
  const normalized = normalizeWhatsAppPhone(phone);
  const variants = new Set<string>([normalized, stripped, `+${normalized}`]);
  if (normalized.startsWith('62') && normalized.length > 2) {
    variants.add(`0${normalized.substring(2)}`);
  }
  return [...variants];
}
