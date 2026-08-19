import { BadRequestException, Injectable } from '@nestjs/common';

export type GoalProjection = { label: string; annualRate: number; targetAmount: number; monthlyContribution: number };

@Injectable()
export class GoalCalculatorService {
  simulate(input: { targetAmount: number; timePeriod: number; currentSavings?: number; inflationRate?: number }) {
    const targetAmount = Number(input.targetAmount);
    const timePeriod = Number(input.timePeriod);
    const currentSavings = Number(input.currentSavings ?? 0);
    const inflationRate = Number(input.inflationRate ?? 6);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(timePeriod) || timePeriod < 1 || timePeriod > 50) throw new BadRequestException('Enter a target amount and a time period between 1 and 50 years.');
    if (currentSavings < 0 || inflationRate < 0 || inflationRate > 15) throw new BadRequestException('Savings and inflation assumptions are outside supported ranges.');
    const inflatedTarget = targetAmount * Math.pow(1 + inflationRate / 100, timePeriod);
    const scenarios = [
      { label: 'Conservative illustration', annualRate: 7 },
      { label: 'Base illustration', annualRate: 10 },
      { label: 'Higher illustration', annualRate: 12 },
    ].map((scenario) => ({ ...scenario, targetAmount: inflatedTarget, monthlyContribution: this.monthlyContribution(inflatedTarget, currentSavings, timePeriod, scenario.annualRate) }));
    return { targetAmount, currentSavings, inflationRate, adjustedTargetAmount: inflatedTarget, scenarios, disclaimer: 'Illustrations are not guaranteed returns. Actual outcomes can be lower or higher, and inflation can change.' };
  }

  private monthlyContribution(target: number, currentSavings: number, years: number, annualRate: number) {
    const periods = years * 12;
    const monthlyRate = annualRate / 100 / 12;
    const futureValueOfSavings = currentSavings * Math.pow(1 + monthlyRate, periods);
    const required = Math.max(0, target - futureValueOfSavings);
    return Math.ceil((required * monthlyRate / (Math.pow(1 + monthlyRate, periods) - 1)) / 100) * 100;
  }
}
