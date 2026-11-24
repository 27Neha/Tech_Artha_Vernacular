import { Injectable } from '@nestjs/common';
import { RiskSignal } from './fund-suitability.service';

@Injectable()
export class FundRiskAlertService {
  evaluateRiskMismatch(userProfile: string, riskSignal: RiskSignal) {
    if (userProfile === 'CONSERVATIVE' && (riskSignal === RiskSignal.HIGH || riskSignal === RiskSignal.VERY_HIGH)) {
      return {
        severity: 'HIGH',
        message: `Your current profile is Conservative, but this fund's estimated quantitative risk signal is ${riskSignal.replace('_', ' ')}. This fund may experience larger fluctuations and losses than funds generally aligned with your profile.`
      };
    }
    if (userProfile === 'MODERATE' && riskSignal === RiskSignal.VERY_HIGH) {
      return {
        severity: 'MEDIUM',
        message: `Your current profile is Moderate, but this fund's estimated quantitative risk signal is Very High. This fund may experience larger fluctuations and losses than funds generally aligned with your profile.`
      };
    }
    return null;
  }
}
