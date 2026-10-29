import { All, Controller, Header, Logger, Req } from '@nestjs/common';
import type { Request } from 'express';

/**
 * The pages Cybrilla returns the investor to after paying, or after approving an
 * auto-debit mandate with their bank. They open in the investor's browser, not the app.
 *
 * Deliberately they report no outcome. Whatever arrives on the redirect is unverified,
 * and Cybrilla does not document its shape, so nothing here reads it to decide what to
 * show. The page says what happens next and hands the investor back to the app, whose
 * Portfolio and mandate screens re-check the real status with Cybrilla when they reopen.
 *
 * Both GET and POST are accepted, since the redirect method is not documented either.
 */
type Page = { title: string; text: string; deepLink: string };

const PAGES: Record<'payment' | 'mandate', Page> = {
  payment: {
    title: 'Thank you',
    text: 'Return to the TechArtha app to see the status of your order. Units are allotted only once the fund house confirms your payment, which can take a little while.',
    deepLink: 'techartha://payment-complete',
  },
  mandate: {
    title: 'Thank you',
    text: 'Return to the TechArtha app to see whether your bank has approved the auto-debit mandate. Approval can take a few minutes; once approved you can use it for SIPs.',
    deepLink: 'techartha://mandate-complete',
  },
};

// Static text only, so no escaping is needed; nothing from the request is echoed back.
export const renderPostbackPage = ({ title, text, deepLink }: Page) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>TechArtha</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F8F9FB; color: #102A54; }
  main { max-width: 420px; margin: 0 auto; padding: 48px 20px; }
  .card { background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 10px; }
  p { color: #4A5568; font-size: 15px; line-height: 1.5; margin: 0 0 20px; }
  a.button { display: block; text-align: center; background: #3C3985; color: #fff; text-decoration: none; font-weight: 700; padding: 14px; border-radius: 12px; }
  .hint { font-size: 13px; color: #718096; margin: 16px 0 0; }
</style>
</head>
<body>
<main>
  <div class="card">
    <h1>${title}</h1>
    <p>${text}</p>
    <a class="button" href="${deepLink}">Return to TechArtha</a>
    <p class="hint">If the app does not open, close this page and open TechArtha yourself.</p>
  </div>
</main>
<script>window.location.href = ${JSON.stringify(deepLink)};</script>
</body>
</html>`;

@Controller()
export class PostbackController {
  private readonly logger = new Logger(PostbackController.name);

  @All('payments/postback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  payment(@Req() req: Request) {
    this.record('payment', req);
    return renderPostbackPage(PAGES.payment);
  }

  @All('mandates/postback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  mandate(@Req() req: Request) {
    this.record('mandate', req);
    return renderPostbackPage(PAGES.mandate);
  }

  /** Logs which fields the gateway sent, to learn its undocumented redirect format. */
  private record(kind: string, req: Request) {
    const fields = [...Object.keys(req.query ?? {}), ...Object.keys((req.body as object) ?? {})];
    this.logger.log(`${kind} postback (${req.method}) with fields: ${fields.join(', ') || 'none'}`);
  }
}
