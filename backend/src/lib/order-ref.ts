import crypto from 'crypto';

export function generateOrderReferenceId(): string {
  const timestamp = Date.now();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${timestamp}-${suffix}`;
}