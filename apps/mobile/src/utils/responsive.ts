import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';

/**
 * TechArtha Global Responsive Typography & Layout Engine
 *
 * Baseline design viewport: 390 x 844 (standard modern smartphone).
 * Automatically scales font sizes up on larger displays and down on compact displays,
 * while harmonizing with the user's OS font-size accessibility preference so text
 * remains crisp, proportional, and unclipped across every device in the app.
 */

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export function computeFontScaleFactor(
  width: number,
  height: number,
  osFontScale: number = PixelRatio.getFontScale() || 1,
): number {
  if (!width || !height) return 1;

  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  let screenFactor: number;
  if (shortSide >= 600) {
    // Tablets / unfolded foldables: gentle, readable upscale without oversized UI
    const tabletRatio = shortSide / 600;
    screenFactor = Math.min(1.22, 1.1 + (tabletRatio - 1) * 0.18);
  } else {
    // Phones (compact 320-360px -> ~0.86-0.93x, standard 390px -> 1.0x, large 412-448px -> ~1.06-1.15x)
    const widthRatio = shortSide / BASE_WIDTH;
    const heightRatio = longSide / BASE_HEIGHT;
    const blended = widthRatio * 0.72 + heightRatio * 0.28;
    screenFactor = Math.max(0.85, Math.min(1.18, blended));
  }

  // Respect OS font-size settings smoothly up to 1.35x; gently cap extreme zoom (>1.35x)
  // so single-line headers, badges, and buttons never clip or overflow containers.
  const safeOsScale = Math.max(0.85, osFontScale || 1);
  if (safeOsScale > 1.35) {
    return screenFactor * (1.35 / safeOsScale);
  }

  return screenFactor;
}

/**
 * Scales a font size proportionally to the current device screen dimensions.
 */
export function scaleFont(size: number, customFactor?: number): number {
  const { width, height } = Dimensions.get('window');
  const factor = customFactor ?? computeFontScaleFactor(width, height, PixelRatio.getFontScale());
  const scaled = size * factor;
  // Preserve 0.5pt precision for crisp sub-pixel typography
  return Math.max(8, Math.round(PixelRatio.roundToNearestPixel(scaled) * 2) / 2);
}

/**
 * Scales lineHeight by the exact same factor as fontSize so Indic/vernacular scripts
 * and multi-line paragraphs never clip ascenders or descenders.
 */
export function scaleLineHeight(lineHeight: number, customFactor?: number): number {
  const { width, height } = Dimensions.get('window');
  const factor = customFactor ?? computeFontScaleFactor(width, height, PixelRatio.getFontScale());
  return Math.max(11, Math.round(lineHeight * factor));
}

/**
 * Reactive hook for components with dynamic inline typography or layout calculations.
 */
export function useResponsive() {
  const { width, height, fontScale } = useWindowDimensions();
  const factor = computeFontScaleFactor(width, height, fontScale || 1);

  return {
    width,
    height,
    fontScale: fontScale || 1,
    factor,
    rf: (size: number) => Math.max(8, Math.round(PixelRatio.roundToNearestPixel(size * factor) * 2) / 2),
    rlh: (lh: number) => Math.max(11, Math.round(lh * factor)),
    isSmallScreen: Math.min(width, height) < 365 || Math.max(width, height) < 720,
    isLargeScreen: Math.min(width, height) >= 410 && Math.max(width, height) >= 880,
  };
}
