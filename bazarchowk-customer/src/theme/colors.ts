// ─── BazarChowk Brand Colors ──────────────────────────────────────────────────

export const BrandColors = {
  // Primary — Signature green
  primary: '#00B140',
  primaryDark: '#008F3C',
  primarySurface: '#EAF8F0',

  // Semantic/Accents
  softOrange: '#FFF1DF',
  softBlue: '#EEF5FF',
  softPink: '#FCEFF6',
  
  // Secondary — Warm orange (keeping existing for backward compatibility)
  secondary: '#FF8A00',
  secondaryLight: '#FFA333',
  secondaryDark: '#CC6E00',
  secondarySurface: '#FFF3E0',

  // Neutrals
  white: '#FFFFFF',
  background: '#F7FAF8',
  black: '#0A0A0A',
  textPrimary: '#122018',
  textSecondary: '#66736B',
  
  grey50: '#F8F9FA',
  grey100: '#F1F3F5',
  grey200: '#E9ECEF',
  grey300: '#DEE2E6',
  grey400: '#CED4DA',
  grey500: '#ADB5BD',
  grey600: '#6C757D',
  grey700: '#495057',
  grey800: '#343A40',
  grey900: '#212529',

  // Semantic
  success: '#22C55E',
  successSurface: '#EAF8F0',
  warning: '#F59E0B',
  warningSurface: '#FEF3C7',
  error: '#EF4444',
  errorSurface: '#FEE2E2',
  info: '#3B82F6',
  infoSurface: '#EEF5FF', // mapped to softBlue

  // Transparent
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.15)',
  overlayWhite: 'rgba(255,255,255,0.15)',
  transparent: 'transparent',
} as const;

export const LightTheme = {
  // Backgrounds
  background: BrandColors.background,
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#F1F3F5',
  card: '#FFFFFF',
  cardBorder: '#E9ECEF',

  // Text
  text: BrandColors.textPrimary,
  textSecondary: BrandColors.textSecondary,
  textTertiary: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Brand
  primary: BrandColors.primary,
  primaryLight: BrandColors.primary,
  primarySurface: BrandColors.primarySurface,
  secondary: BrandColors.secondary,
  secondarySurface: BrandColors.secondarySurface,

  // UI
  border: '#E5EBE7',
  divider: '#F1F3F5',
  shadow: 'rgba(0,0,0,0.08)',
  placeholder: '#ADB5BD',
  disabled: '#CED4DA',

  // Status bar
  statusBar: 'dark' as const,

  // Tab bar
  tabActive: BrandColors.primary,
  tabInactive: '#ADB5BD',
  tabBackground: '#FFFFFF',
} as const;

export const DarkTheme = {
  // Backgrounds
  background: '#0D0D0D',
  backgroundSecondary: '#1A1A1A',
  backgroundTertiary: '#242424',
  card: '#1A1A1A',
  cardBorder: '#2A2A2A',

  // Text
  text: '#F8F9FA',
  textSecondary: '#ADB5BD',
  textTertiary: '#6C757D',
  textInverse: '#0A0A0A',

  // Brand
  primary: BrandColors.primary,
  primaryLight: BrandColors.primary,
  primarySurface: 'rgba(0,177,64,0.15)',
  secondary: BrandColors.secondary,
  secondarySurface: 'rgba(255,138,0,0.15)',

  // UI
  border: '#2A2A2A',
  divider: '#1F1F1F',
  shadow: 'rgba(0,0,0,0.4)',
  placeholder: '#6C757D',
  disabled: '#3A3A3A',

  // Status bar
  statusBar: 'light' as const,

  // Tab bar
  tabActive: BrandColors.primary,
  tabInactive: '#6C757D',
  tabBackground: '#0D0D0D',
} as const;

export type Theme = {
  [K in keyof typeof LightTheme]: string;
} & {
  statusBar: 'light' | 'dark';
};
export type ThemeMode = 'light' | 'dark';
