export const getFeatureFlags = () => ({
  BANK_LINKING_ENABLED: process.env.BANK_LINKING_ENABLED === 'true',
  EXPENSE_MANAGEMENT_ENABLED: process.env.EXPENSE_MANAGEMENT_ENABLED === 'true',
  CYBRILLA_PRODUCTION_ENABLED: process.env.CYBRILLA_PRODUCTION_ENABLED === 'true',
});

export const isBankLinkingEnabled = (): boolean => process.env.BANK_LINKING_ENABLED === 'true';

export const isExpenseManagementEnabled = (): boolean => process.env.EXPENSE_MANAGEMENT_ENABLED === 'true';

export const isCybrillaProductionEnabled = (): boolean => process.env.CYBRILLA_PRODUCTION_ENABLED === 'true';
