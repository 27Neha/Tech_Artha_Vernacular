export type ChartRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

export interface ChartDataPoint {
  timestamp: string;
  label: string;
  value: number;
}

export interface MarketIndexQuote {
  symbol: string;
  name: string;
  currentValue: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  marketStatus: 'Open' | 'Closed' | 'Pre-open';
  lastUpdated: string;
  source: string;
}

export interface MarketMood {
  sentiment: 'Positive' | 'Mixed' | 'Cautious' | 'Neutral';
  score: number; // 0 to 100
  rationale: string;
  advanceDeclineRatio: string;
  methodology: string;
  lastUpdated: string;
}

export interface SectorMovement {
  sector: string;
  changePercent: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface MarketOverviewResponse {
  nifty50: MarketIndexQuote;
  sensex: MarketIndexQuote;
  sectors: SectorMovement[];
  marketMood: MarketMood;
  charts: Record<ChartRange, ChartDataPoint[]>;
  disclaimer: string;
}

export interface MarketNewsItem {
  id: string;
  headline: string;
  summary: string;
  originalSource: string;
  publishedAt: string;
  url: string;
  category: 'Indian Markets' | 'Banking & Finance' | 'Technology' | 'Economy' | 'Mutual Funds' | 'RBI & Policy';
  whyItMatters: string;
  readTime: string;
}

export interface PersonalMarketBrief {
  id: string;
  title: string;
  greetingContext: string;
  summary: string;
  detailedAnalysis: string;
  whySeeingThis: string;
  actionableInsight: string;
  relevantCategory: string;
  source: string;
  date: string;
}

export interface DailyMoneyLesson {
  id: string;
  topic: string;
  title: string;
  readTimeMinutes: number;
  summary: string;
  paragraphs: string[];
  keyTakeaways: string[];
  actionItem: string;
  source: string;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MarketQuiz {
  id: string;
  question: string;
  options: QuizOption[];
  explanation: string;
  educationalTakeaway: string;
}
