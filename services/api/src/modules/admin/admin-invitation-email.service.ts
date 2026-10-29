import { Injectable, Logger } from '@nestjs/common';

export interface SendInvitationEmailInput {
  toEmail: string;
  toName: string;
  roleName: string;
  inviterName: string;
  invitationLink: string;
  expiresInHours?: number;
  customMessage?: string;
}

export interface InvitationEmailResult {
  delivered: boolean;
  provider: 'resend' | 'development_fallback';
  messageId?: string;
  warning?: string;
}

@Injectable()
export class AdminInvitationEmailService {
  private readonly logger = new Logger(AdminInvitationEmailService.name);

  async sendInvitation(input: SendInvitationEmailInput): Promise<InvitationEmailResult> {
    const resendKey = process.env.RESEND_API_KEY;
    const isResendConfigured = resendKey && resendKey !== '<server-side-api-key>' && !resendKey.includes('<');

    const html = this.buildInvitationEmailHtml(input);
    const subject = `You've been invited to TechArtha Administrative Platform as ${input.roleName}`;

    if (isResendConfigured) {
      try {
        const from = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'TechArtha Platform <support@techartha.com>';
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [input.toEmail],
            subject,
            html,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const errStr = data ? JSON.stringify(data) : `HTTP ${response.status}`;
          this.logger.warn(`Resend email delivery failed for ${input.toEmail}: ${errStr}`);
          return {
            delivered: false,
            provider: 'resend',
            warning: `Resend provider rejected delivery: ${errStr}. The invitation record is active and can be accepted with the secure link.`,
          };
        }

        this.logger.log(`[AdminInvitation] Sent invitation email via Resend to ${input.toEmail} (ID: ${data?.id})`);
        return {
          delivered: true,
          provider: 'resend',
          messageId: data?.id,
        };
      } catch (err: any) {
        this.logger.error(`Resend connection error: ${err.message}`);
        return {
          delivered: false,
          provider: 'resend',
          warning: `Network error connecting to email provider: ${err.message}. Invitation is valid.`,
        };
      }
    }

    // Development / Local Fallback when Resend key is not configured
    this.logger.log(
      `[AdminInvitation] [DEVELOPMENT] Invitation created for ${input.toEmail} (${input.roleName}). Email service not configured; acceptance link generated for manual test.`,
    );

    return {
      delivered: false,
      provider: 'development_fallback',
      warning: 'Email provider not configured (RESEND_API_KEY is unset). Invitation token was generated safely.',
    };
  }

  private buildInvitationEmailHtml(input: SendInvitationEmailInput): string {
    const expiry = input.expiresInHours || 24;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Invitation - TechArtha</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8F9FB; margin: 0; padding: 24px; color: #102A54; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(16,42,84,0.05); }
    .header { background: linear-gradient(135deg, #102A54 0%, #36358D 100%); padding: 32px 28px; color: #ffffff; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; color: #F7941D; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .title { font-size: 22px; font-weight: 800; margin: 0; }
    .body { padding: 28px; }
    .greeting { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
    .desc { font-size: 14px; color: #4A5568; line-height: 1.6; margin-bottom: 24px; }
    .role-box { background: #EEF0FB; border: 1px solid #D8DCF5; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
    .role-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
    .role-label { color: #718096; font-weight: 500; }
    .role-val { color: #102A54; font-weight: 700; }
    .btn { display: inline-block; background: #3C3985; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; text-align: center; }
    .btn-container { text-align: center; margin: 28px 0; }
    .notice { font-size: 12px; color: #718096; line-height: 1.5; border-top: 1px solid #E2E8F0; padding-top: 20px; }
    .footer { background: #F8F9FA; padding: 16px 28px; font-size: 11px; color: #A0AEC0; text-align: center; border-top: 1px solid #EDF2F7; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Staff Invitation</div>
      <h1 class="title">TechArtha Admin Portal</h1>
    </div>
    <div class="body">
      <div class="greeting">Hello ${input.toName || 'Team Member'},</div>
      <p class="desc">
        <strong>${input.inviterName}</strong> has invited you to join the <strong>TechArtha Internal Administration Platform</strong> with the authorized role of <strong>${input.roleName}</strong>.
      </p>

      ${input.customMessage ? `<div style="background:#FFF9F2; border-left:4px solid #F7941D; padding:12px 14px; border-radius:6px; font-size:13px; color:#7B341E; margin-bottom:20px;"><em>"${input.customMessage}"</em></div>` : ''}

      <div class="role-box">
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="color: #718096; padding: 4px 0;">Designated Email:</td>
            <td style="color: #102A54; font-weight: 700; text-align: right; padding: 4px 0;">${input.toEmail}</td>
          </tr>
          <tr>
            <td style="color: #718096; padding: 4px 0;">Assigned Role:</td>
            <td style="color: #3C3985; font-weight: 800; text-align: right; padding: 4px 0;">${input.roleName}</td>
          </tr>
          <tr>
            <td style="color: #718096; padding: 4px 0;">Invitation Valid For:</td>
            <td style="color: #C05621; font-weight: 700; text-align: right; padding: 4px 0;">${expiry} hours</td>
          </tr>
        </table>
      </div>

      <div class="btn-container">
        <a href="${input.invitationLink}" class="btn">Accept Invitation & Set Password &rarr;</a>
      </div>

      <div class="notice">
        <strong>Security Notice:</strong> This invitation is single-use and cryptographically tied to <code>${input.toEmail}</code>. Do not forward this link. If you did not expect this invitation, please notify our security team at <a href="mailto:security@techartha.com" style="color:#3C3985;">security@techartha.com</a>.
      </div>
    </div>
    <div class="footer">
      TechArtha Technologies Private Limited &bull; Internal Operations Platform &bull; Confidential
    </div>
  </div>
</body>
</html>`;
  }
}
