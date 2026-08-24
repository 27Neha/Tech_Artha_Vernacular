import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, input: { amount: number; category: string; description?: string; occurredAt?: string }) {
    if (!Number.isFinite(Number(input.amount)) || Number(input.amount) <= 0) throw new BadRequestException('Expense amount must be greater than zero.');
    if (!input.category?.trim()) throw new BadRequestException('Choose an expense category.');
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) throw new BadRequestException('Expense date is not valid.');
    return this.prisma.expense.create({ data: { userId, amount: Number(input.amount), category: input.category.trim(), description: input.description?.trim(), occurredAt } });
  }

  async summary(userId: string) {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const expenses = await this.prisma.expense.findMany({ where: { userId, occurredAt: { gte: start } }, orderBy: { occurredAt: 'desc' } });
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totals = expenses.reduce<Record<string, number>>((result, expense) => ({ ...result, [expense.category]: (result[expense.category] ?? 0) + expense.amount }), {});
    const categories = Object.entries(totals).map(([category, amount]) => ({ category, amount, percentage: total ? Math.round((amount / total) * 100) : 0 }));
    return { monthStart: start, total, categories, expenses, source: 'MANUAL', insight: expenses.length ? 'This summary is based only on expenses you have entered or authorised.' : 'Add an expense to begin your private monthly summary.' };
  }
}
