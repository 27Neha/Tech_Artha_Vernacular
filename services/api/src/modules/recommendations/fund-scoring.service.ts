import { Injectable } from '@nestjs/common';
import { FundAnalytics } from './fund-analytics.service';

@Injectable()
export class FundScoringService {
  public readonly SCORING_VERSION = "fund-recommendation-v2";

  score(suitability: any, quality: any, analytics: FundAnalytics) {
    // Base configured weights (Total = 1.0)
    let wRisk = 0.20; // 20%
    let wGoal = 0.20; // 20%
    let wHorizon = 0.15; // 15%
    let wStrategy = 0.15; // 15%
    let wCons = 0.10; // 10%
    let wPerf = 0.07; // 7%
    let wRiskAdj = 0.08; // 8%
    let wQual = 0.05; // 5%

    // Handle Missing Analytics Gracefully (Dynamic Weighting)
    if (analytics.consistency === null) {
      wCons = 0;
      quality.confidence -= 10;
    }
    if (analytics.cagr3Y === null && analytics.return1Y === null) {
      wPerf = 0;
      quality.confidence -= 15;
    }
    if (analytics.sharpeRatio === null) {
      wRiskAdj = 0;
      quality.confidence -= 15;
    }

    // Re-normalize active weights to sum to 1
    const totalActiveWeight = wRisk + wGoal + wHorizon + wStrategy + wCons + wPerf + wRiskAdj + wQual;
    const normalizeWeight = (w: number) => w / totalActiveWeight;

    // Component Scores
    const consistencyScore = analytics.consistency !== null ? analytics.consistency : 0;
    
    // Performance score (relative to a generous but reachable benchmark, e.g., 12%)
    const rawPerf = analytics.cagr5Y || analytics.cagr3Y || analytics.return1Y || 0;
    const perfScore = Math.min(Math.max((rawPerf / 12) * 100, 0), 100);

    // Risk-Adjusted Score (Sharpe-like scaling)
    // Sharpe of 0 is poor (Score 20), Sharpe of 1.0 is great (Score 80), Sharpe > 1.5 is excellent (Score 100)
    let riskAdjScore = 0;
    if (analytics.sharpeRatio !== null) {
      riskAdjScore = Math.min(Math.max(20 + (analytics.sharpeRatio * 60), 0), 100);
    }

    const finalScore = 
      (suitability.riskScore * normalizeWeight(wRisk)) +
      (suitability.goalScore * normalizeWeight(wGoal)) +
      (suitability.horizonScore * normalizeWeight(wHorizon)) +
      (suitability.strategyFitScore * normalizeWeight(wStrategy)) +
      (consistencyScore * normalizeWeight(wCons)) +
      (perfScore * normalizeWeight(wPerf)) +
      (riskAdjScore * normalizeWeight(wRiskAdj)) +
      (quality.confidence * normalizeWeight(wQual));

    return {
      totalScore: parseFloat(finalScore.toFixed(2)),
      confidenceScore: quality.confidence,
      strategyFitScore: suitability.strategyFitScore,
      consistencyScore,
      historicalPerformanceScore: parseFloat(perfScore.toFixed(2)),
      riskAdjustedScore: parseFloat(riskAdjScore.toFixed(2)),
      dataQualityScore: quality.confidence
    };
  }
}
