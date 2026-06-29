import * as crypto from 'crypto';

/**
 * Verify Kapso X-Webhook-Signature (HMAC-SHA256 hex digest).
 * @see https://docs.kapso.ai/docs/platform/webhooks/security
 */
export function verifyKapsoWebhookSignature(
  signature: string,
  secret: string,
  rawBody: string,
  parsedPayload?: unknown,
): boolean {
  if (!secret || !signature) return false;

  const received = signature.trim().replace(/^sha256=/i, '');
  const materials = [rawBody];
  if (parsedPayload !== undefined) {
    materials.push(JSON.stringify(parsedPayload));
  }

  for (const material of materials) {
    if (!material) continue;

    const expected = crypto.createHmac('sha256', secret).update(material).digest('hex');
    if (received.length !== expected.length) continue;

    try {
      if (
        crypto.timingSafeEqual(
          Buffer.from(received, 'utf8'),
          Buffer.from(expected, 'utf8'),
        )
      ) {
        return true;
      }
    } catch {
      // length mismatch — try next material
    }
  }

  return false;
}
