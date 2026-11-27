import { Body, Controller, Delete, Get, Param, Post, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { AccessTokenGuard, CurrentUser } from '../../common/auth';
import type { AuthenticatedUser } from '../../common/auth';
import { ExpensesService } from './expenses.service';
import { isExpenseManagementEnabled } from '../../common/feature-flags';

@Controller('expenses')
@UseGuards(AccessTokenGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  summary(@CurrentUser() user: AuthenticatedUser) {
    if (!isExpenseManagementEnabled()) {
      throw new ServiceUnavailableException({
        code: 'FEATURE_DISABLED',
        message: 'Expense management is currently unavailable while Account Aggregator integration is being prepared.',
      });
    }
    return this.expenses.summary(user.id);
  }

  @Post()
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { amount: number; category: string; description?: string; occurredAt?: string },
  ) {
    if (!isExpenseManagementEnabled()) {
      throw new ServiceUnavailableException({
        code: 'FEATURE_DISABLED',
        message: 'Expense management is currently unavailable while Account Aggregator integration is being prepared.',
      });
    }
    return this.expenses.add(user.id, body);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    if (!isExpenseManagementEnabled()) {
      throw new ServiceUnavailableException({
        code: 'FEATURE_DISABLED',
        message: 'Expense management is currently unavailable while Account Aggregator integration is being prepared.',
      });
    }
    return this.expenses.delete(user.id, id);
  }
}
