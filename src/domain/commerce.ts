export type EntitlementSource = 'starter' | 'achievement' | 'purchase' | 'promotion';
export interface Entitlement {
  userId: string;
  itemId: string;
  source: EntitlementSource;
  grantedAt: string;
  revokedAt: string | null;
}
export interface CatalogItem {
  id: string;
  kind: 'avatar' | 'skin';
  name: string;
  assetId: string;
  active: boolean;
}
export interface CheckoutRequest {
  userId: string;
  itemId: string;
  returnUrl: string;
}
/** Implement on the server only. Resolve price/currency from a trusted catalog, never the browser. */
export interface BillingProvider {
  createCheckout(request: CheckoutRequest): Promise<{ checkoutId: string; url: string }>;
  verifyWebhook(
    rawBody: string,
    signature: string,
  ): Promise<{ eventId: string; orderId: string; status: 'paid' | 'refunded' | 'failed' }>;
}
/** Paid ownership must come from the server; do not use local avatarProgress() as payment authority. */
export interface EntitlementRepository {
  listForUser(userId: string): Promise<Entitlement[]>;
}
