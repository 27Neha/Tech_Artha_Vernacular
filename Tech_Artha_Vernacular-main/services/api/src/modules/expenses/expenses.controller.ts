import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(AccessTokenGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.expenses.summary(user.id);
  }

  @Post()
  add(@CurrentUser() user: AuthenticatedUser, @Body() body: { amount: number; category: string; description?: string; occurredAt?: string }) {
    return this.expenses.add(user.id, body);
  }
}
