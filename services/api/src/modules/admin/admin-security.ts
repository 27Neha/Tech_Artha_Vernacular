import * as crypto from 'crypto';

export class AdminSecurity {
  /**
   * Hashes a password using PBKDF2 with SHA-512 and a random 16-byte salt (100,000 rounds).
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Securely verifies a password against the stored salt:hash using timing-safe comparison.
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    try {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) return false;
      const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verify, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Generates a 64-character high-entropy hex invitation token and its SHA-256 hash.
   * Only the hash is stored in the database; the raw token is sent to the invitee.
   */
  static generateInvitationToken(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    return { rawToken, tokenHash };
  }

  /**
   * Computes SHA-256 hash of a raw token.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Masking helpers for sensitive data fields (PII).
   */
  static maskEmail(email?: string | null): string | null {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.com';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}@${domain}`;
  }

  static maskPhone(phone?: string | null): string | null {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length < 5) return '******';
    const last4 = clean.slice(-4);
    return `+91 ******${last4}`;
  }

  static maskPan(pan?: string | null): string | null {
    if (!pan) return null;
    const clean = pan.trim();
    if (clean.length < 5) return '*****';
    return `${clean.slice(0, 2)}*****${clean.slice(-2)}`;
  }

  static maskBankAccount(acc?: string | null): string | null {
    if (!acc) return null;
    const clean = acc.trim();
    if (clean.length < 4) return '****';
    return `XXXX-XXXX-${clean.slice(-4)}`;
  }
}
