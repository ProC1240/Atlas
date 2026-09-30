import { z } from 'zod';

const destinations = new Set([
  '/',
  '/overview',
  '/anatomy',
  '/progress',
  '/avatar',
  '/bond',
  '/me',
]);
export const oauthLifetime = 600;
export function authDestination(value: unknown) {
  return typeof value === 'string' && destinations.has(value) ? value : '/';
}
const transactionSchema = z.object({
  state: z.string().regex(/^[a-f0-9]{64}$/),
  next: z.string(),
  expires: z.number().int(),
});
export function readOAuthTransaction(
  raw: string | undefined,
  state: string | null,
  now = Date.now(),
) {
  try {
    const transaction = transactionSchema.parse(JSON.parse(raw ?? ''));
    if (!state || transaction.state !== state || transaction.expires <= now) return null;
    return { ...transaction, next: authDestination(transaction.next) };
  } catch {
    return null;
  }
}
