export interface TabBarInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface ComputedTabBarMetrics {
  bottomInset: number;
  paddingTop: number;
  paddingBottom: number;
  paddingHorizontal: number;
  contentHeight: number;
  totalHeight: number;
}

const TAB_BAR_CONTENT_HEIGHT = 56;
const TAB_BAR_PADDING_TOP = 8;
const MIN_BOTTOM_PADDING = 10;
const MIN_HORIZONTAL_PADDING = 6;

/**
 * Computes Android/iOS-safe bottom tab bar height & insets so labels never clip or hide
 * under 3-button Android navigation bars, gesture navigation pills, or iOS home indicators.
 */
export function computeTabBarMetrics(insets: TabBarInsets = {}): ComputedTabBarMetrics {
  const rawBottom = Math.max(0, Math.round(insets.bottom ?? 0));
  const rawLeft = Math.max(0, Math.round(insets.left ?? 0));
  const rawRight = Math.max(0, Math.round(insets.right ?? 0));

  const bottomInset = Math.max(rawBottom, MIN_BOTTOM_PADDING);
  const paddingHorizontal = Math.max(rawLeft, rawRight, MIN_HORIZONTAL_PADDING);
  const totalHeight = TAB_BAR_CONTENT_HEIGHT + TAB_BAR_PADDING_TOP + bottomInset;

  return {
    bottomInset,
    paddingTop: TAB_BAR_PADDING_TOP,
    paddingBottom: bottomInset,
    paddingHorizontal,
    contentHeight: TAB_BAR_CONTENT_HEIGHT,
    totalHeight,
  };
}

/**
 * Ensures scrollable screen content clears either the system navigation bar (stack screens)
 * or maintains comfortable bottom breathing room above the tab bar (tab screens).
 */
export function getScrollBottomPadding(insetsBottom = 0, extra = 24): number {
  return Math.max(Math.max(0, Math.round(insetsBottom)), 14) + extra;
}
