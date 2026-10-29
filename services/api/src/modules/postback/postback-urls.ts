/**
 * Where Cybrilla returns the investor after a payment or a mandate approval.
 *
 * In a deployed environment PUBLIC_API_URL is the API's public https address (for
 * example https://api-staging.techartha.com) and the investor lands on our postback
 * page, which sends them back into the app. The same addresses are registered with
 * Cybrilla as the tenant's default postback URLs.
 *
 * Locally there is no public address, so the app's own scheme is used directly.
 * PAYMENT_POSTBACK_URL / MANDATE_POSTBACK_URL override either, if ever needed.
 */
const publicBase = () => (process.env.PUBLIC_API_URL || '').replace(/\/+$/, '');

export const paymentPostbackUrl = () =>
  process.env.PAYMENT_POSTBACK_URL || (publicBase() ? `${publicBase()}/payments/postback` : 'techartha://payment-complete');

export const mandatePostbackUrl = () =>
  process.env.MANDATE_POSTBACK_URL || (publicBase() ? `${publicBase()}/mandates/postback` : 'techartha://mandate-complete');
