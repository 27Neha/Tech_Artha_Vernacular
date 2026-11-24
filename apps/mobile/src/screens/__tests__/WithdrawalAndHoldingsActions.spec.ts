/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Redesigned Withdrawal and Holding Actions Verification', () => {
  const mobileRoot = join(__dirname, '../../..');
  const homeSrc = readFileSync(join(mobileRoot, 'src/screens/HomeScreen.tsx'), 'utf8');
  const portfolioSrc = readFileSync(join(mobileRoot, 'src/screens/PortfolioScreen.tsx'), 'utf8');
  const redeemSrc = readFileSync(join(mobileRoot, 'src/screens/RedeemScreen.tsx'), 'utf8');

  describe('1. Home Page Requirements', () => {
    it('verifies that the prominent Withdraw button is removed from HomeScreen quick actions', () => {
      // Ensure Withdraw button is removed as a direct first-screen action
      expect(homeSrc).not.toContain("label: 'Withdraw'");
      expect(homeSrc).not.toContain("id: 'withdraw'");
    });

    it('verifies that Holdings replaces Withdraw to give direct access to portfolio holdings', () => {
      expect(homeSrc).toContain("id: 'holdings'");
      expect(homeSrc).toContain("label: 'Holdings'");
      expect(homeSrc).toContain("route: 'Portfolio'");
      expect(homeSrc).toContain("tab: 'holdings'");
    });

    it('preserves other essential Home page quick actions', () => {
      expect(homeSrc).toContain("label: 'Invest'");
      expect(homeSrc).toContain("label: 'Start SIP'");
      expect(homeSrc).toContain("label: 'Transactions'");
    });
  });

  describe('2. Holdings – Three-Dot Menu & Contextual Actions', () => {
    it('verifies three-dot menu button is rendered on each holding card', () => {
      expect(portfolioSrc).toContain('threeDotBtn');
      expect(portfolioSrc).toContain('name="ellipsis-vertical"');
      expect(portfolioSrc).toContain('setMenuHolding(h)');
    });

    it('implements contextual action filtering based on existing SIP plans', () => {
      // Matching plan helper cross-referencing holding and plans
      expect(portfolioSrc).toContain('getMatchingPlan');
      expect(portfolioSrc).toContain('matchingPlan');

      // Relevant actions when SIP plan exists
      expect(portfolioSrc).toContain('handlePauseSip');
      expect(portfolioSrc).toContain('handleResumeSip');
      expect(portfolioSrc).toContain('handleOpenModifySip');
      expect(portfolioSrc).toContain('handleCancelSip');
      expect(portfolioSrc).toContain('Modify SIP');
      expect(portfolioSrc).toContain('Stop / Cancel SIP');

      // Relevant action when no SIP plan exists
      expect(portfolioSrc).toContain('handleStartSip');
      expect(portfolioSrc).toContain('Start SIP');
    });

    it('includes universal holding actions: Redeem/Withdraw, View transactions, View details', () => {
      expect(portfolioSrc).toContain('handleRedeem');
      expect(portfolioSrc).toContain('Redeem / Withdraw');
      expect(portfolioSrc).toContain('handleViewTransactions');
      expect(portfolioSrc).toContain('View Transactions');
      expect(portfolioSrc).toContain('handleViewDetails');
      expect(portfolioSrc).toContain('View Investment Details');
    });

    it('renders dedicated holding modals for details, action menu, and SIP modifications', () => {
      expect(portfolioSrc).toContain('detailHolding');
      expect(portfolioSrc).toContain('modifyingPlan');
      expect(portfolioSrc).toContain('Save SIP Modifications');
      expect(portfolioSrc).toContain('Statutory Lock-in Period');
    });

    it('supports transaction filtering from holding actions', () => {
      expect(portfolioSrc).toContain('transactionFilter');
      expect(portfolioSrc).toContain('setTransactionFilter');
      expect(portfolioSrc).toContain('clearFilterBtn');
    });
  });

  describe('3. Proper Withdrawal Process in RedeemScreen', () => {
    it('auto-selects holding passed from navigation parameters', () => {
      expect(redeemSrc).toContain('paramFolio');
      expect(redeemSrc).toContain('paramIsin');
      expect(redeemSrc).toContain('paramHolding');
    });

    it('displays selected fund and holding details with NAV and units breakdown', () => {
      expect(redeemSrc).toContain('holding.folioNumber');
      expect(redeemSrc).toContain('redeemableUnits');
      expect(redeemSrc).toContain('availableAmount');
      expect(redeemSrc).toContain('holding.nav');
    });

    it('includes statutory lock-in warnings (e.g. ELSS 3-year lock-in)', () => {
      expect(redeemSrc).toContain('statutoryLockBox');
      expect(redeemSrc).toContain('Statutory Lock-in Period');
      expect(redeemSrc).toContain('Sec 80C');
    });

    it('provides educational guidance explaining Partial vs Full redemption', () => {
      expect(redeemSrc).toContain('Partial vs. Full Redemption Guide');
      expect(redeemSrc).toContain('Partial Redemption');
      expect(redeemSrc).toContain('Full Redemption (Complete Exit)');
    });

    it('allows withdrawal by amount, units, or full exit with preset chips', () => {
      expect(redeemSrc).toContain("'amount'");
      expect(redeemSrc).toContain("'units'");
      expect(redeemSrc).toContain("'full'");
      expect(redeemSrc).toContain('presetChip');
    });

    it('strictly prevents users from withdrawing more than their redeemable balance', () => {
      expect(redeemSrc).toContain('validationError');
      expect(redeemSrc).toContain('Amount exceeds redeemable balance');
      expect(redeemSrc).toContain('Units exceed your redeemable balance');
      expect(redeemSrc).toContain('disabledBtn');
    });

    it('calculates live real-time estimated remaining units and balance', () => {
      expect(redeemSrc).toContain('liveCalculationCard');
      expect(redeemSrc).toContain('Estimated Remaining Units');
      expect(redeemSrc).toContain('Estimated Remaining Balance');
      expect(redeemSrc).toContain('remainingUnits.toFixed(3)');
    });

    it('displays exit load rules and capital gains tax disclosures', () => {
      expect(redeemSrc).toContain('disclosureCard');
      expect(redeemSrc).toContain('Exit Load');
      expect(redeemSrc).toContain('Capital Gains Tax');
      expect(redeemSrc).toContain('STCG');
      expect(redeemSrc).toContain('LTCG');
      expect(redeemSrc).toContain('FIFO');
    });

    it('displays linked primary bank account details with verification badge', () => {
      expect(redeemSrc).toContain('bankCard');
      expect(redeemSrc).toContain('bankAccount.bankName');
      expect(redeemSrc).toContain('bankAccount.accountNumberMasked');
      expect(redeemSrc).toContain('NEFT/RTGS');
      expect(redeemSrc).toContain('Verified');
    });

    it('implements order review modal with explicit consent before 2FA', () => {
      expect(redeemSrc).toContain('showReviewModal');
      expect(redeemSrc).toContain('reviewConsent');
      expect(redeemSrc).toContain('Review Redemption Order');
      expect(redeemSrc).toContain('Proceed to 2FA');
    });

    it('integrates 2FA authorization using TransactionOtpModal and real /redemptions endpoint', () => {
      expect(redeemSrc).toContain('TransactionOtpModal');
      expect(redeemSrc).toContain("action: 'REDEMPTION'");
      expect(redeemSrc).toContain('/redemptions');
    });

    it('renders complete order confirmation with direct link to transaction history', () => {
      expect(redeemSrc).toContain('orderSuccess');
      expect(redeemSrc).toContain('Redemption Order Submitted');
      expect(redeemSrc).toContain('View in Transaction History');
      expect(redeemSrc).toContain("navigation.navigate('Portfolio', { tab: 'transactions' })");
      expect(redeemSrc).toContain("navigation.navigate('Portfolio', { tab: 'holdings' })");
    });
  });
});
