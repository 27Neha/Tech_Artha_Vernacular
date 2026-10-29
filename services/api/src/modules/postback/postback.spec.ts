import { PostbackController, renderPostbackPage } from './postback.controller';
import { mandatePostbackUrl, paymentPostbackUrl } from './postback-urls';

describe('postback URLs', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('point at our pages on the public address when deployed', () => {
    delete process.env.PAYMENT_POSTBACK_URL;
    delete process.env.MANDATE_POSTBACK_URL;
    process.env.PUBLIC_API_URL = 'https://api-staging.techartha.com/';
    expect(paymentPostbackUrl()).toBe('https://api-staging.techartha.com/payments/postback');
    expect(mandatePostbackUrl()).toBe('https://api-staging.techartha.com/mandates/postback');
  });

  it("fall back to the app's own scheme locally", () => {
    delete process.env.PUBLIC_API_URL;
    delete process.env.PAYMENT_POSTBACK_URL;
    delete process.env.MANDATE_POSTBACK_URL;
    expect(paymentPostbackUrl()).toBe('techartha://payment-complete');
    expect(mandatePostbackUrl()).toBe('techartha://mandate-complete');
  });
});

describe('PostbackController', () => {
  const controller = new PostbackController();
  const req = (query: Record<string, string>, body: Record<string, string> = {}) => ({ method: 'POST', query, body }) as any;

  it('hands the investor back to the app without claiming an outcome', () => {
    const html = controller.payment(req({ status: 'success' }));
    expect(html).toContain('techartha://payment-complete');
    expect(html).not.toMatch(/success|payment received/i);
  });

  it('never echoes what arrives on the redirect', () => {
    const html = controller.mandate(req({ status: '<script>alert(1)</script>' }, { id: '"><img>' }));
    expect(html).toContain('techartha://mandate-complete');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('<img>');
  });

  it('renders a complete page', () => {
    expect(renderPostbackPage({ title: 'T', text: 'x', deepLink: 'techartha://x' })).toMatch(/^<!doctype html>/);
  });
});
