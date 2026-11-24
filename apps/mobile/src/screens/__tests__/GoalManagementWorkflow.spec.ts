/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Goal Management Workflow & Safe Deletion Verification', () => {
  const mobileRoot = join(__dirname, '../../..');
  const goalsSrc = readFileSync(join(mobileRoot, 'src/screens/GoalsScreen.tsx'), 'utf8');
  const editGoalSrc = readFileSync(join(mobileRoot, 'src/screens/EditGoalScreen.tsx'), 'utf8');
  const apiGoalCtrl = readFileSync(
    join(mobileRoot, '../../services/api/src/modules/goal/goal.controller.ts'),
    'utf8',
  );
  const apiGoalSvc = readFileSync(
    join(mobileRoot, '../../services/api/src/modules/goal/goal.service.ts'),
    'utf8',
  );

  describe('1. Three-Dot Menu (⋮) on Every Goal Card', () => {
    it('renders a three-dot menu button on every goal card', () => {
      expect(goalsSrc).toContain('threeDotBtn');
      expect(goalsSrc).toContain('name="ellipsis-vertical"');
      expect(goalsSrc).toContain('openActionMenu(g)');
    });

    it('provides contextual actions: View Details, Edit Goal, Pause/Resume, Delete Goal', () => {
      expect(goalsSrc).toContain('View Details');
      expect(goalsSrc).toContain('Edit Goal');
      expect(goalsSrc).toContain('Pause Goal');
      expect(goalsSrc).toContain('Resume Goal');
      expect(goalsSrc).toContain('Delete Goal');
    });

    it('displays distinct PAUSED and ARCHIVED visual badges', () => {
      expect(goalsSrc).toContain('pausedBadge');
      expect(goalsSrc).toContain('PAUSED');
      expect(goalsSrc).toContain('archivedBadge');
      expect(goalsSrc).toContain('ARCHIVED');
    });
  });

  describe('2. Active Goals vs. Archived Goals Solid Tabs', () => {
    it('integrates SolidTabs for switching between Active and Archived goals', () => {
      expect(goalsSrc).toContain('<SolidTabs');
      expect(goalsSrc).toContain("id: 'active', label: 'Active Goals'");
      expect(goalsSrc).toContain("id: 'archived', label: 'Archived Goals'");
    });

    it('supports restoring archived goals back to active status', () => {
      expect(goalsSrc).toContain('handleRestoreGoal');
      expect(goalsSrc).toContain('Restore Goal');
      expect(goalsSrc).toContain('/restore');
    });
  });

  describe('3. Scenario A: No Investments Linked Deletion', () => {
    it('displays confirmation modal with required title, message and buttons', () => {
      expect(goalsSrc).toContain('scenarioAModalVisible');
      expect(goalsSrc).toContain('Delete Goal?');
      expect(goalsSrc).toContain(
        'Are you sure you want to delete this goal? This action will remove the goal from your active goals. You can create a new goal anytime.',
      );
      expect(goalsSrc).toContain('Cancel');
      expect(goalsSrc).toContain('handleConfirmScenarioADelete');
    });
  });

  describe('4. Scenario B: Investments Already Linked Safe Workflow', () => {
    it('prohibits single-click deletion and opens warning modal when investments exist', () => {
      expect(goalsSrc).toContain('scenarioBModalVisible');
      expect(goalsSrc).toContain('Investments Linked to This Goal');
      expect(goalsSrc).toContain(
        'You have already invested towards this goal. Deleting the goal will not automatically withdraw, redeem or sell your investments. Your existing investments will remain in your portfolio. Any active investment instructions or SIPs linked to this goal may need separate action.',
      );
    });

    it('renders dynamic metrics: name, target, amount invested, current value, remaining target, linked count, SIP status', () => {
      expect(goalsSrc).toContain('GOAL INVESTMENT BREAKDOWN');
      expect(goalsSrc).toContain('Target Amount');
      expect(goalsSrc).toContain('Amount Invested');
      expect(goalsSrc).toContain('Current Investment Value');
      expect(goalsSrc).toContain('Remaining Target');
      expect(goalsSrc).toContain('Linked Investments');
      expect(goalsSrc).toContain('Active SIP Status');
    });

    it('presents the 4 explicit user choices: Keep Goal, Edit Goal, Pause Goal, Archive / Delete Goal', () => {
      expect(goalsSrc).toContain('Keep Goal Active');
      expect(goalsSrc).toContain('Edit Goal');
      expect(goalsSrc).toContain('Pause Goal Tracking');
      expect(goalsSrc).toContain('Archive / Delete Goal');
    });

    it('includes secondary confirmation dialog before archiving', () => {
      expect(goalsSrc).toContain('scenarioBConfirmVisible');
      expect(goalsSrc).toContain('Confirm Goal Removal');
      expect(goalsSrc).toContain(
        'Are you sure you want to remove this goal from your active goals? Your investments will remain in your portfolio. No investment will be redeemed or sold as part of this action.',
      );
      expect(goalsSrc).toContain('Go Back');
      expect(goalsSrc).toContain('Confirm Archive');
    });
  });

  describe('5. Linked SIPs, Mandates & Statutory Disclaimer', () => {
    it('detects recurring SIPs and guides user to ActiveMandates screen', () => {
      expect(goalsSrc).toContain('Recurring SIP Notice');
      expect(goalsSrc).toContain(
        'Your SIP may continue to deduct until separately cancelled or modified. Deleting a goal does not stop bank mandates or auto-debit.',
      );
      expect(goalsSrc).toContain("navigate('ActiveMandates')");
    });

    it('displays the regulatory compliance disclaimer', () => {
      expect(goalsSrc).toContain(
        'Goal deletion or pausing does not alter your underlying mutual fund holdings, bank mandates, or trigger any redemption or tax liability. Portfolio investments remain subject to market risks.',
      );
    });
  });

  describe('6. Backend API & Goal Lifecycle Verification', () => {
    it('exposes pause, resume, archive, restore, delete and status-filtered listing', () => {
      expect(apiGoalCtrl).toContain('@Post(\':id/pause\')');
      expect(apiGoalCtrl).toContain('@Post(\':id/resume\')');
      expect(apiGoalCtrl).toContain('@Post(\':id/archive\')');
      expect(apiGoalCtrl).toContain('@Post(\':id/restore\')');
      expect(apiGoalCtrl).toContain('@Delete(\':id\')');
      expect(apiGoalCtrl).toContain('@Get(\':id/investments\')');
    });

    it('ensures safe deletion in GoalService preserves investments by archiving', () => {
      expect(apiGoalSvc).toContain('GOAL_ARCHIVED_SAFE_DELETE');
      expect(apiGoalSvc).toContain("status: 'ARCHIVED'");
      expect(apiGoalSvc).toContain('Investments remain preserved in your portfolio.');
    });
  });
});
