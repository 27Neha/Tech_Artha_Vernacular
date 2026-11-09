import { Injectable } from '@nestjs/common';

export enum NormalizedCategory {
  EQUITY_LARGE_CAP = 'EQUITY_LARGE_CAP',
  EQUITY_MID_CAP = 'EQUITY_MID_CAP',
  EQUITY_SMALL_CAP = 'EQUITY_SMALL_CAP',
  EQUITY_MULTI_CAP = 'EQUITY_MULTI_CAP',
  EQUITY_FLEXI_CAP = 'EQUITY_FLEXI_CAP',
  EQUITY_ELSS = 'EQUITY_ELSS',
  DEBT_LIQUID = 'DEBT_LIQUID',
  DEBT_SHORT_DURATION = 'DEBT_SHORT_DURATION',
  DEBT_CORPORATE = 'DEBT_CORPORATE',
  DEBT_GILT = 'DEBT_GILT',
  DEBT_OTHER = 'DEBT_OTHER',
  HYBRID_BALANCED = 'HYBRID_BALANCED',
  HYBRID_CONSERVATIVE = 'HYBRID_CONSERVATIVE',
  HYBRID_AGGRESSIVE = 'HYBRID_AGGRESSIVE',
  INDEX = 'INDEX',
  UNKNOWN = 'UNKNOWN'
}

@Injectable()
export class FundCategoryService {
  normalize(schemeName: string, schemeCategory: string): NormalizedCategory {
    const combined = (schemeName + ' ' + schemeCategory).toLowerCase();
    
    if (combined.includes('liquid') || combined.includes('money market')) return NormalizedCategory.DEBT_LIQUID;
    if (combined.includes('short duration') || combined.includes('ultra short')) return NormalizedCategory.DEBT_SHORT_DURATION;
    if (combined.includes('corporate bond')) return NormalizedCategory.DEBT_CORPORATE;
    if (combined.includes('gilt')) return NormalizedCategory.DEBT_GILT;
    if (combined.includes('debt') || combined.includes('bond') || combined.includes('income')) return NormalizedCategory.DEBT_OTHER;

    if (combined.includes('index') || combined.includes('etf') || combined.includes('nifty')) return NormalizedCategory.INDEX;

    if (combined.includes('large cap')) return NormalizedCategory.EQUITY_LARGE_CAP;
    if (combined.includes('mid cap')) return NormalizedCategory.EQUITY_MID_CAP;
    if (combined.includes('small cap')) return NormalizedCategory.EQUITY_SMALL_CAP;
    if (combined.includes('multi cap')) return NormalizedCategory.EQUITY_MULTI_CAP;
    if (combined.includes('flexi cap')) return NormalizedCategory.EQUITY_FLEXI_CAP;
    if (combined.includes('elss') || combined.includes('tax saver')) return NormalizedCategory.EQUITY_ELSS;
    
    if (combined.includes('hybrid') || combined.includes('balanced') || combined.includes('multi asset')) {
      if (combined.includes('conservative')) return NormalizedCategory.HYBRID_CONSERVATIVE;
      if (combined.includes('aggressive')) return NormalizedCategory.HYBRID_AGGRESSIVE;
      return NormalizedCategory.HYBRID_BALANCED;
    }

    if (combined.includes('equity') || combined.includes('growth')) return NormalizedCategory.EQUITY_MULTI_CAP;

    return NormalizedCategory.UNKNOWN;
  }
}
