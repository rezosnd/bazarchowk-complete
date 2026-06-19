// ─── BazarChowk Brand Colors ──────────────────────────────────────────────────

export const BrandColors = {
  // Primary — Signature green
  primary: '#00B140',
  primaryLight: '#33C068',
  primaryDark: '#008F33',
  primarySurface: '#E6F9ED',

  // Secondary — Warm orange
  secondary: '#FF8A00',
  secondaryLight: '#FFA333',
  secondaryDark: '#CC6E00',
  secondarySurface: '#FFF3E0',

  // Neutrals
  white: '#FFFFFF',
  black: '#0A0A0A',
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
  successSurface: '#DCFCE7',
  warning: '#F59E0B',
  warningSurface: '#FEF3C7',
  error: '#EF4444',
  errorSurface: '#FEE2E2',
  info: '#3B82F6',
  infoSurface: '#EFF6FF',

  // Transparent
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.15)',
  overlayWhite: 'rgba(255,255,255,0.15)',
  transparent: 'transparent',
} as const;

export const LightTheme = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F1F3F5',
  card: '#FFFFFF',
  cardBorder: '#E9ECEF',

  // Text
  text: '#0A0A0A',
  textSecondary: '#495057',
  textTertiary: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Brand
  primary: BrandColors.primary,
  primaryLight: BrandColors.primaryLight,
  primarySurface: BrandColors.primarySurface,
  secondary: BrandColors.secondary,
  secondarySurface: BrandColors.secondarySurface,

  // UI
  border: '#E9ECEF',
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
  primary: BrandColors.primaryLight,
  primaryLight: BrandColors.primaryLight,
  primarySurface: 'rgba(0,177,64,0.15)',
  secondary: BrandColors.secondaryLight,
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
  tabActive: BrandColors.primaryLight,
  tabInactive: '#6C757D',
  tabBackground: '#0D0D0D',
} as const;

export type Theme = {
  [K in keyof typeof LightTheme]: string;
} & {
  statusBar: 'light' | 'dark';
};
export type ThemeMode = 'light' | 'dark';
