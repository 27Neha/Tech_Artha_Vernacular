export const getFeatureFlags = () => ({
  BANK_LINKING_ENABLED: process.env.BANK_LINKING_ENABLED !== 'false',
  EXPENSE_MANAGEMENT_ENABLED: process.env.EXPENSE_MANAGEMENT_ENABLED !== 'false',
  CYBRILLA_PRODUCTION_ENABLED: process.env.CYBRILLA_PRODUCTION_ENABLED === 'true',
});

export const isBankLinkingEnabled = (): boolean => process.env.BANK_LINKING_ENABLED !== 'false';

export const isExpenseManagementEnabled = (): boolean => process.env.EXPENSE_MANAGEMENT_ENABLED !== 'false';

export const isCybrillaProductionEnabled = (): boolean => process.env.CYBRILLA_PRODUCTION_ENABLED === 'true';
