/// <reference types="node" />
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeTabBarMetrics, getScrollBottomPadding } from '../tabBarMetrics';

describe('tabBarMetrics & MainTabs configuration', () => {
  it('preserves a full 56dp content box across Android 3-button, gesture, zero-inset, and iOS modes', () => {
    const scenarios = [
      { label: 'Android non-edge-to-edge (0dp)', insets: { bottom: 0 }, expectedBottom: 10 },
      { label: 'Android gesture nav (24dp)', insets: { bottom: 24 }, expectedBottom: 24 },
      { label: 'Android 3-button nav (48dp)', insets: { bottom: 48 }, expectedBottom: 48 },
      { label: 'iOS Home Indicator (34dp)', insets: { bottom: 34 }, expectedBottom: 34 },
      { label: 'Negative or missing insets', insets: { bottom: -5 }, expectedBottom: 10 },
    ];

    for (const s of scenarios) {
      const m = computeTabBarMetrics(s.insets);
      expect(m.paddingBottom).toBe(s.expectedBottom);
      const innerContentBox = m.totalHeight - m.paddingTop - m.paddingBottom;
      expect(innerContentBox).toBe(56);
    }
  });

  it('respects horizontal landscape/cutout safe-area insets without clipping labels', () => {
    const portrait = computeTabBarMetrics({ bottom: 48, left: 0, right: 0 });
    expect(portrait.paddingHorizontal).toBe(6);

    const cutout = computeTabBarMetrics({ bottom: 24, left: 44, right: 16 });
    expect(cutout.paddingHorizontal).toBe(44);
  });

  it('computes safe scroll bottom padding above system navigation bars', () => {
    expect(getScrollBottomPadding(0, 24)).toBe(38);
    expect(getScrollBottomPadding(48, 24)).toBe(72);
    expect(getScrollBottomPadding(34, 32)).toBe(66);
  });

  it('configures App.tsx MainTabs with dynamic insets, below-icon labels, and equal-flex items', () => {
    const appSource = readFileSync(join(__dirname, '../../..', 'App.tsx'), 'utf8');
    expect(appSource).toContain('useSafeAreaInsets()');
    expect(appSource).toContain('computeTabBarMetrics(insets)');
    expect(appSource).toContain('tabBarShowLabel: true');
    expect(appSource).toContain("tabBarLabelPosition: 'below-icon'");
    expect(appSource).toContain('tabBarHideOnKeyboard: true');
    expect(appSource).toContain('includeFontPadding: false');
    expect(appSource).toContain('numberOfLines={1}');
    expect(appSource).toContain('flex: 1');
    expect(appSource).not.toContain('tabBarShowLabel: false');
    expect(appSource).not.toContain('width: 64');
  });
});
