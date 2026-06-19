import { useColorScheme } from 'react-native';
import { LightTheme, DarkTheme, type Theme } from '@/theme';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DarkTheme : LightTheme;
}
