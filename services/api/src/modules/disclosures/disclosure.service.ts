import { Injectable } from '@nestjs/common';

const MARKET_RISK = 'Mutual fund investments are subject to market risks. Please read all scheme-related documents carefully before investing.';

const TERMS_SUMMARY = [
  'TechArtha is a mutual fund distributor. We do not provide investment advice and do not guarantee returns.',
  'Mutual fund investments are subject to market risks. Read all scheme related documents carefully.',
  'Your PAN, date of birth and KYC details are shared with our regulated KYC and transaction partners solely to open and operate your investment account.',
  'Orders are placed with the AMC through our regulated transaction partner. Allotment is subject to the AMC and RTA.',
  'You may withdraw consent and request deletion of your account at any time.',
];

@Injectable()
export class DisclosureService {
  /**
   * The terms the investor accepts, with the version that gets recorded against their
   * consent. Served rather than hardcoded in the app so the text shown and the version
   * stored can never drift apart across app releases.
   */
  terms(locale = 'en') {
    return {
      key: 'TERMS_AND_CONDITIONS',
      version: '2026.10',
      locale,
      summary: TERMS_SUMMARY,
      status: 'PUBLISHED',
    };
  }

  marketRisk(locale = 'en') {
    return {
      key: 'MUTUAL_FUND_MARKET_RISK',
      version: '2026.08',
      locale,
      content: MARKET_RISK,
      status: 'PUBLISHED',
      note: 'Scheme Risk-o-Meter, charges, exit load and taxation must be sourced from authorised scheme documents before any proposal is displayed.',
    };
  }
}
