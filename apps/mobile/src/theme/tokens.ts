/**
 * TechArtha Design System Tokens
 * Derived strictly from the official TechArtha brand logo:
 * - Emblem & "Tech": Deep Indigo (#36358D)
 * - Chevron & "Artha": Vibrant Fintech Orange (#F7941D)
 * - Tagline & Headlines: Midnight Navy (#102A54)
 */

export const colors = {
  // Brand
  primary: '#36358D',
  primaryDark: '#232262',
  primaryLight: '#4A48A8',
  primaryMuted: '#EBEBFA',
  primarySurface: '#F4F4FD',

  // Accent (from logo 'Artha' and upper-right chevron)
  accent: '#F7941D',
  accentDark: '#DD6B20',
  accentLight: '#FFAE42',
  accentMuted: '#FFF4E8',
  accentSurface: '#FFFAF0',

  // Neutrals & Surfaces
  canvas: '#F8F9FD',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#EDF2F7',
  divider: '#F1F5F9',

  // Typography
  textPrimary: '#102A54',     // Midnight navy for high-contrast headings
  textSecondary: '#4A5568',   // Medium gray for body & descriptions
  textMuted: '#718096',       // Muted gray for captions & timestamps
  textPlaceholder: '#A0AEC0', // Light gray for inputs
  textInverse: '#FFFFFF',

  // Semantic Risk Levels
  risk: {
    conservative: '#2B6CB0',      // Balanced steel blue
    conservativeMuted: '#EBF8FF',
    moderate: '#2F855A',          // Forest emerald green
    moderateMuted: '#F0FFF4',
    aggressive: '#DD6B20',        // Energetic flame coral
    aggressiveMuted: '#FFFAF0',
    veryAggressive: '#E53E3E',
    veryAggressiveMuted: '#FFF5F5',
  },

  // Semantic Status
  status: {
    success: '#276749',
    successBg: '#F0FFF4',
    successBorder: '#C6F6D5',
    warning: '#C05621',
    warningBg: '#FFFAF0',
    warningBorder: '#FEEBC8',
    error: '#C53030',
    errorBg: '#FFF5F5',
    errorBorder: '#FEB2B2',
    info: '#2B6CB0',
    infoBg: '#EBF8FF',
    infoBorder: '#BEE3F8',
  },
};

export const typography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },
  lineHeights: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.6,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardElevated: {
    shadowColor: '#102A54',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  buttonPrimary: {
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonAccent: {
    shadowColor: '#F7941D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  glowPrimary: {
    shadowColor: '#36358D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
};
