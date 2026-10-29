/**
 * Suitability of a single fund against the investor's assessed risk profile.
 *
 * A bucket is only ever offered to profiles listed in its eligibleFor, so it needs no
 * check at order time. A fund chosen directly can be anything, so its risk is estimated
 * from MFAPI's scheme_category and compared with the profile. A fund above the profile
 * is not blocked: the investor is shown the mismatch and must acknowledge it, and the
 * order records that they did.
 *
 * This is an estimate from the SEBI category, not the scheme's own Risk-o-Meter, which
 * MFAPI does not publish. It errs high: a category it does not recognise is treated as
 * the riskiest level, so an unknown fund always asks for acknowledgement rather than
 * silently passing.
 */
export const RISK_LEVELS = ['CONSERVATIVE', 'MODERATELY_LOW', 'MODERATE', 'MODERATELY_HIGH', 'AGGRESSIVE'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** First match wins, so the narrower categories sit above the broad ones they overlap. */
const CATEGORY_RULES: [RegExp, RiskLevel][] = [
  [/overnight|liquid|money market|arbitrage/, 'CONSERVATIVE'],
  [/credit risk/, 'MODERATE'],
  [/conservative hybrid|hybrid conservative/, 'MODERATELY_LOW'],
  [/ultra short|low duration|short duration|medium|long duration|dynamic bond|corporate bond|banking and psu|gilt|floater|debt|income/, 'MODERATELY_LOW'],
  [/equity savings|balanced advantage|dynamic asset|multi asset|balanced hybrid/, 'MODERATE'],
  [/aggressive hybrid/, 'MODERATELY_HIGH'],
  [/small cap|mid cap|sectoral|thematic|international|overseas/, 'AGGRESSIVE'],
  [/equity|elss|large cap|flexi|multi cap|focused|value|contra|dividend yield|index|etf|gold|silver/, 'MODERATELY_HIGH'],
];

export function fundRiskLevel(schemeCategory: string | null | undefined): RiskLevel {
  const category = (schemeCategory ?? '').toLowerCase();
  return CATEGORY_RULES.find(([pattern]) => pattern.test(category))?.[1] ?? 'AGGRESSIVE';
}

export type Suitability = {
  fundRiskLevel: RiskLevel;
  investorProfile: string;
  requiresAcknowledgement: boolean;
};

export function assessSuitability(schemeCategory: string | null | undefined, investorProfile: string): Suitability {
  const fundLevel = fundRiskLevel(schemeCategory);
  const profileIndex = RISK_LEVELS.indexOf(investorProfile as RiskLevel);
  return {
    fundRiskLevel: fundLevel,
    investorProfile,
    // An unrecognised profile can't be compared, so it is treated as the most cautious.
    requiresAcknowledgement: RISK_LEVELS.indexOf(fundLevel) > (profileIndex === -1 ? 0 : profileIndex),
  };
}
