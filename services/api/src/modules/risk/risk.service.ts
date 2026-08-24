import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentService } from '../consent/consent.service';
import { RISK_ASSESSMENT_VERSION, RISK_QUESTIONS } from './risk-questionnaire';

type Answers = Record<string, number> | number[];

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService, private readonly consents: ConsentService) {}

  questionnaire() {
    return { version: RISK_ASSESSMENT_VERSION, questions: RISK_QUESTIONS, note: 'Your investor profile is different from a scheme Risk-o-Meter. This is a suitability assessment, not a return prediction.' };
  }

  async calculateRisk(userId: string, answers: Answers, consent = false) {
    if (!consent) throw new BadRequestException('Explicit consent is required before a risk assessment.');
    const normalized = this.normalizeAnswers(answers);
    const values = Object.values(normalized);
    if (values.length < 5) throw new BadRequestException('Answer at least five risk questions to receive a profile.');
    if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) throw new BadRequestException('Each risk answer must be between 1 and 5.');
    const score = values.reduce((sum, value) => sum + value, 0);
    const maxScore = values.length * 5;
    const ratio = score / maxScore;
    const category = ratio < 0.5 ? 'CONSERVATIVE' : ratio < 0.75 ? 'MODERATE' : 'AGGRESSIVE';
    const reasons = this.reasons(normalized, category);

    await this.consents.grant({ userId, type: 'RISK', source: 'APP' });
    const data = { score, category, answers: JSON.stringify(normalized), version: RISK_ASSESSMENT_VERSION, reasons: JSON.stringify(reasons) };
    const profile = await this.prisma.riskProfile.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    await this.prisma.riskAssessment.create({ data: { userId, ...data } });
    await this.prisma.auditLog.create({ data: { userId, action: 'RISK_ASSESSMENT_COMPLETED', details: JSON.stringify({ version: RISK_ASSESSMENT_VERSION, score, category }) } });
    return { data: profile, explanation: reasons, disclaimer: 'This investor profile is not a scheme Risk-o-Meter and does not guarantee performance.' };
  }

  private normalizeAnswers(answers: Answers): Record<string, number> {
    if (Array.isArray(answers)) return Object.fromEntries(answers.map((value, index) => [RISK_QUESTIONS[index]?.id ?? `question_${index + 1}`, Number(value)]));
    if (!answers || typeof answers !== 'object') throw new BadRequestException('Risk answers must be a list or question-answer map.');
    return Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, Number(value)]));
  }

  private reasons(answers: Record<string, number>, category: string) {
    const reasons: string[] = [`Your responses currently indicate a ${category.toLowerCase()} investor profile.`];
    if ((answers.horizon ?? 0) <= 2) reasons.push('A shorter investment horizon means preserving access to money is important.');
    if ((answers.loss_tolerance ?? 0) >= 3) reasons.push('You indicated you can stay with a suitable plan through temporary market falls.');
    if ((answers.liquidity ?? 0) <= 2) reasons.push('Near-term money needs should be kept separate from market-linked investments.');
    return reasons;
  }
}
