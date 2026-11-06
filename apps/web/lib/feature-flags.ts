/**
 * Centralized feature flags for the TechArtha investor-facing application.
 * Bank linking and Expense management remain disabled until production regulatory
 * and API clearances are completed.
 */

export const isBankLinkingEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_BANK_LINKING_ENABLED === 'true';

export const isExpenseManagementEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_EXPENSE_MANAGEMENT_ENABLED === 'true';

export const isCybrillaProductionEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_CYBRILLA_PRODUCTION_ENABLED === 'true';
