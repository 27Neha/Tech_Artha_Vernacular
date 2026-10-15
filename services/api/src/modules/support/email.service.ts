import { Injectable, Logger } from '@nestjs/common';

export interface SendSupportAcknowledgementInput {
  to: string;
  userName?: string;
  referenceId: string;
  subject: string;
  message: string;
  status?: string;
  createdAt?: Date;
}

export interface EmailSendResult {
  provider: 'resend' | 'zeptomail' | 'smtp' | 'mock';
  success: boolean;
  messageId?: string;
}

@Injectable()
export class SupportEmailService {
  private readonly logger = new Logger(SupportEmailService.name);

  async sendQueryAcknowledgementEmail(input: SendSupportAcknowledgementInput): Promise<EmailSendResult> {
    const toAddress = input.to.trim();
    if (!toAddress || !toAddress.includes('@')) {
      throw new Error(`Invalid recipient email address: "${input.to}"`);
    }

    const html = this.buildAcknowledgementEmailHtml(input);
    const emailSubject = `[${input.referenceId}] We've received your query: ${input.subject}`;

    // 1. Resend Integration (if RESEND_API_KEY is configured)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && resendApiKey !== '<server-side-api-key>' && !resendApiKey.includes('<')) {
      return this.sendViaResend({
        apiKey: resendApiKey,
        to: toAddress,
        subject: emailSubject,
        html,
      });
    }

    // 2. Zoho ZeptoMail Integration (if configured and enabled)
    const zeptoEnabled = process.env.ZEPTOMAIL_ENABLED === 'true';
    const zeptoToken = process.env.ZEPTOMAIL_SEND_MAIL_TOKEN;
    if (zeptoEnabled && zeptoToken && !zeptoToken.includes('<')) {
      return this.sendViaZeptoMail({
        token: zeptoToken,
        to: toAddress,
        subject: emailSubject,
        html,
      });
    }

    // 3. SMTP / Nodemailer Integration (if SMTP is configured)
    const smtpHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
    if (smtpHost && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      return this.sendViaSmtp({
        host: smtpHost,
        to: toAddress,
        subject: emailSubject,
        html,
      });
    }

    // 4. Safe Development / Mock Fallback
    const masked = toAddress.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`);
    this.logger.log(`[SupportEmailService] [MOCK] Sent query acknowledgement email to ${masked} for query ${input.referenceId}`);
    return {
      provider: 'mock',
      success: true,
      messageId: `mock-${Date.now()}-${input.referenceId}`,
    };
  }

  private async sendViaResend(opts: {
    apiKey: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<EmailSendResult> {
    const from = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'TechArtha Support <support@techartha.com>';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errDetails = data ? JSON.stringify(data) : `Status ${response.status}`;
      this.logger.error(`Resend API Error: ${response.status} - ${errDetails}`);
      throw new Error(`Resend provider failed: ${errDetails}`);
    }

    this.logger.log(`[SupportEmailService] Successfully sent email via Resend (id: ${data?.id})`);
    return {
      provider: 'resend',
      success: true,
      messageId: data?.id,
    };
  }

  private async sendViaZeptoMail(opts: {
    token: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<EmailSendResult> {
    const fromAddress = process.env.ZEPTOMAIL_FROM_EMAIL || 'support@techartha.com';
    const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'TechArtha Support';
    const authHeader = opts.token.startsWith('Zoho-enczapikey ') ? opts.token : `Zoho-enczapikey ${opts.token}`;

    const payload = {
      from: { address: fromAddress, name: fromName },
      to: [{ email_address: { address: opts.to, name: 'Valued Investor' } }],
      subject: opts.subject,
      htmlbody: opts.html,
    };

    const response = await fetch(process.env.ZEPTOMAIL_URL || 'https://api.zeptomail.in/v1.1/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errDetails = data ? JSON.stringify(data) : `Status ${response.status}`;
      this.logger.error(`ZeptoMail API Error: ${response.status} - ${errDetails}`);
      throw new Error(`ZeptoMail provider failed: ${errDetails}`);
    }

    this.logger.log(`[SupportEmailService] Successfully sent email via ZeptoMail`);
    return {
      provider: 'zeptomail',
      success: true,
      messageId: data?.data?.[0]?.message_id,
    };
  }

  private async sendViaSmtp(opts: {
    host: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<EmailSendResult> {
    // Dynamic import to avoid runtime dependency issues if nodemailer isn't used
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: opts.host,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const from = process.env.EMAIL_FROM || 'TechArtha Support <support@techartha.com>';
    const info = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });

    this.logger.log(`[SupportEmailService] Successfully sent email via SMTP (id: ${info.messageId})`);
    return {
      provider: 'smtp',
      success: true,
      messageId: info.messageId,
    };
  }

  buildAcknowledgementEmailHtml(input: SendSupportAcknowledgementInput): string {
    const greetingName = input.userName?.trim() ? input.userName.trim() : 'Valued Investor';
    const statusLabel = input.status || 'Received';
    const formattedDate = (input.createdAt || new Date()).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Escape basic HTML entities in user input to prevent HTML injection
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const safeSubject = escapeHtml(input.subject);
    const safeMessage = escapeHtml(input.message).replace(/\n/g, '<br/>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Query Acknowledgement - TechArtha</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8F9FB;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #102A54;
      line-height: 1.5;
    }
    .wrapper {
      width: 100%;
      background-color: #F8F9FB;
      padding: 32px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      box-shadow: 0 4px 12px rgba(16, 42, 84, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #102A54 0%, #36358D 100%);
      padding: 32px 28px;
      text-align: left;
    }
    .brand-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #F7941D;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #FFFFFF;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .body-content {
      padding: 32px 28px;
    }
    .greeting {
      font-size: 17px;
      font-weight: 700;
      color: #102A54;
      margin: 0 0 16px 0;
    }
    .ack-highlight {
      background-color: #EEF0FB;
      border-left: 4px solid #36358D;
      padding: 16px 18px;
      border-radius: 8px;
      margin: 0 0 24px 0;
      font-size: 15px;
      color: #102A54;
      font-weight: 500;
      line-height: 1.5;
    }
    .card {
      background-color: #FAFAFC;
      border: 1px solid #EDF2F7;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .card-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #718096;
      margin-bottom: 14px;
      border-bottom: 1px solid #EDF2F7;
      padding-bottom: 8px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    .detail-label {
      color: #718096;
      font-weight: 500;
      width: 35%;
    }
    .detail-value {
      color: #102A54;
      font-weight: 600;
      width: 65%;
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      background-color: #E0E7FF;
      color: #3730A3;
    }
    .ref-pill {
      display: inline-block;
      background: #102A54;
      color: #FFFFFF;
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .message-preview {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px;
      font-size: 13.5px;
      color: #2D3748;
      margin-top: 10px;
      line-height: 1.5;
    }
    .next-steps {
      font-size: 14px;
      color: #4A5568;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .contact-alternatives {
      background: #FFFBF5;
      border: 1px solid #FEEBC8;
      border-radius: 12px;
      padding: 16px 18px;
      margin-bottom: 24px;
      font-size: 13px;
      color: #7B341E;
    }
    .contact-alternatives strong {
      color: #C05621;
    }
    .footer {
      background-color: #F8F9FA;
      border-top: 1px solid #EDF2F7;
      padding: 24px 28px;
      font-size: 12px;
      color: #718096;
      text-align: center;
      line-height: 1.6;
    }
    .footer a {
      color: #36358D;
      text-decoration: none;
    }
    .security-note {
      font-size: 11px;
      color: #A0AEC0;
      margin-top: 12px;
      border-top: 1px dashed #E2E8F0;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="brand-tag">Support Desk</div>
        <h1 class="brand-title">TechArtha</h1>
      </div>
      <div class="body-content">
        <p class="greeting">Hello ${greetingName},</p>
        <div class="ack-highlight">
          We've received your query! Our team is looking into it, and we'll update you as soon as we have more information.
        </div>

        <div class="card">
          <div class="card-title">Query Summary</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
            <tr>
              <td style="padding: 6px 0; color: #718096; font-weight: 500;">Reference ID:</td>
              <td style="padding: 6px 0; text-align: right;"><span class="ref-pill">${input.referenceId}</span></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096; font-weight: 500;">Status:</td>
              <td style="padding: 6px 0; text-align: right;"><span class="badge">${statusLabel}</span></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096; font-weight: 500;">Subject:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #102A54;">${safeSubject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096; font-weight: 500;">Submitted On:</td>
              <td style="padding: 6px 0; text-align: right; color: #4A5568;">${formattedDate}</td>
            </tr>
          </table>

          <div style="margin-top: 12px;">
            <div style="font-size: 12px; font-weight: 700; color: #718096; margin-bottom: 6px;">Your Message:</div>
            <div class="message-preview">${safeMessage}</div>
          </div>
        </div>

        <div class="next-steps">
          <strong>What happens next?</strong><br/>
          Our dedicated investment support desk has begun looking into your inquiry. You will receive an email update whenever there is progress or when your query is resolved. You can also monitor your query status anytime directly inside the TechArtha mobile app under <em>Settings &rsaquo; Contact Us &rsaquo; Query Status</em>.
        </div>

        <div class="contact-alternatives">
          <strong>Need urgent help?</strong><br/>
          If your inquiry requires immediate assistance, connect with our support representatives directly on WhatsApp at <strong>+91 83088 16023</strong>.
        </div>
      </div>

      <div class="footer">
        <div><strong>TechArtha Technologies Private Limited</strong></div>
        <div>AMFI Registered Mutual Fund Distributor</div>
        <div style="margin-top: 6px;">
          Mutual fund investments are subject to market risks. Read all scheme-related documents carefully before investing.
        </div>
        <div class="security-note">
          <strong>Security Notice:</strong> TechArtha representatives will never ask for your password, PIN, or OTP. If anyone contacts you requesting confidential credentials, please report it immediately.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
