import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentService } from '../consent/consent.service';

type AssistantReply = { text: string; intent: string; data?: unknown; requiresConfirmation?: boolean; dataStatus?: string };

@Injectable()
export class AssistantService {
  constructor(private readonly prisma: PrismaService, private readonly consents: ConsentService) {}

  async respond(userId: string, message: string, locale = 'en'): Promise<AssistantReply> {
    const text = message.trim();
    if (!text) return { text: this.copy(locale, 'Ask me about SIPs, goals, expenses, or a financial term.'), intent: 'EMPTY' };
    const lower = text.toLowerCase();
    if (/(invest|redeem|withdraw|buy|sell|change bank|nominee)/.test(lower)) {
      return { text: this.copy(locale, 'I can explain or help you review this action. I cannot execute or approve investments, redemptions, bank changes, KYC changes, nominees, or risk-profile changes. Please review the action in the app and confirm with the required authentication and consent.'), intent: 'SENSITIVE_ACTION', requiresConfirmation: true };
    }
    if (/(sip|systematic investment)/.test(lower)) return { text: this.copy(locale, 'SIP means investing a fixed amount at a regular interval. It does not guarantee returns, and its value can rise or fall with the market.'), intent: 'EXPLAIN_SIP' };
    if (/(nav)/.test(lower)) return { text: this.copy(locale, 'NAV is the per-unit value of a mutual fund. It is not a guaranteed future price or a measure of whether a fund is suitable for you.'), intent: 'EXPLAIN_NAV' };
    if (/(portfolio|holding|return)/.test(lower)) return this.portfolio(userId, locale);
    if (/(expense|spend|kharch|खर्च)/.test(lower)) return this.expenses(userId, locale);
    return { text: this.copy(locale, 'I can explain financial terms in simple language. If verified information is not available, I will tell you instead of guessing.'), intent: 'GENERAL_HELP' };
  }

  private async portfolio(userId: string, locale: string): Promise<AssistantReply> {
    if (!(await this.consents.hasActiveConsent(userId, 'AI_DATA'))) return { text: this.copy(locale, 'To discuss your portfolio, please first give consent for the assistant to use your authorised financial data. I will not access it without that consent.'), intent: 'PORTFOLIO_CONSENT_REQUIRED' };
    const portfolio = await this.prisma.portfolio.findUnique({ where: { userId }, include: { holdings: true } });
    if (!portfolio || portfolio.status !== 'CONNECTED') return { text: this.copy(locale, 'I do not have enough verified portfolio information to answer that. Portfolio data is not connected yet.'), intent: 'PORTFOLIO_UNAVAILABLE', dataStatus: 'NOT_CONNECTED' };
    return { text: this.copy(locale, `Your verified portfolio value is ₹${portfolio.currentValue.toLocaleString('en-IN')}. This is information, not investment advice.`), intent: 'PORTFOLIO_SUMMARY', data: portfolio, dataStatus: portfolio.status };
  }

  private async expenses(userId: string, locale: string): Promise<AssistantReply> {
    if (!(await this.consents.hasActiveConsent(userId, 'AI_DATA'))) return { text: this.copy(locale, 'To discuss expenses, please first give consent for the assistant to use your authorised financial data.'), intent: 'EXPENSE_CONSENT_REQUIRED' };
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const expenses = await this.prisma.expense.findMany({ where: { userId, occurredAt: { gte: monthStart } } });
    if (!expenses.length) return { text: this.copy(locale, 'I do not have enough verified expense information to answer that yet.'), intent: 'EXPENSE_UNAVAILABLE' };
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    return { text: this.copy(locale, `Your recorded expenses this month total ₹${total.toLocaleString('en-IN')}. This is based only on the expenses you entered or authorised.`), intent: 'EXPENSE_SUMMARY', data: { total, source: 'MANUAL' } };
  }

  private copy(locale: string, english: string) {
    if (locale === 'hi') return english; // Content translation provider is intentionally not fabricated.
    if (locale === 'mr') return english;
    return english;
  }
}
