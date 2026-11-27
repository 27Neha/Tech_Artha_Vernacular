import { StyleSheet, Text, TextInput } from 'react-native';
import { scaleFont, scaleLineHeight } from './responsive';

/**
 * Installs global screen-size-proportional typography scaling across the entire app.
 *
 * Every StyleSheet.create(...) across all screens and components automatically scales
 * numeric `fontSize` (and matching `lineHeight`) up on larger screens and down on
 * smaller/compact screens while respecting OS font-size accessibility settings.
 */

const scaledRules = new WeakSet<object>();

function scaleStyleTree<T extends Record<string, any>>(stylesObj: T): T {
  if (!stylesObj || typeof stylesObj !== 'object') return stylesObj;

  const result: Record<string, any> = {};
  for (const key of Object.keys(stylesObj)) {
    const rule = stylesObj[key];
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      result[key] = rule;
      continue;
    }

    if (scaledRules.has(rule)) {
      result[key] = rule;
      continue;
    }

    const nextRule: Record<string, any> = { ...rule };
    if (typeof nextRule.fontSize === 'number') {
      nextRule.fontSize = scaleFont(nextRule.fontSize);
      if (typeof nextRule.lineHeight === 'number') {
        nextRule.lineHeight = scaleLineHeight(nextRule.lineHeight);
      }
    }

    scaledRules.add(nextRule);
    result[key] = nextRule;
  }

  return result as T;
}

export function installResponsiveTypography(): void {
  try {
    const sheetAny = StyleSheet as any;
    if (!sheetAny.__taResponsivePatched && typeof StyleSheet.create === 'function') {
      const originalCreate = StyleSheet.create.bind(StyleSheet);
      sheetAny.create = <T extends Record<string, any>>(styles: T): T => {
        return originalCreate(scaleStyleTree(styles)) as T;
      };
      sheetAny.__taResponsivePatched = true;
    }
  } catch {
    // Gracefully skip if StyleSheet is frozen in test environments
  }

  try {
    const TextAny = Text as any;
    TextAny.defaultProps = TextAny.defaultProps || {};
    if (TextAny.defaultProps.maxFontSizeMultiplier === undefined) {
      TextAny.defaultProps.maxFontSizeMultiplier = 1.35;
    }

    const TextInputAny = TextInput as any;
    TextInputAny.defaultProps = TextInputAny.defaultProps || {};
    if (TextInputAny.defaultProps.maxFontSizeMultiplier === undefined) {
      TextInputAny.defaultProps.maxFontSizeMultiplier = 1.35;
    }
  } catch {
    // Ignore if defaultProps is read-only
  }
}

installResponsiveTypography();
