import { useColorScheme as _useColorScheme } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Theme } from '@react-navigation/native';

type CustomTheme = Theme & {
  dark: boolean;
  colors: {
    primary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    notification: string;
  };
};

/**
 * A hook that returns the current color scheme of the app.
 * It uses the theme from react-navigation if available,
 * otherwise falls back to the system color scheme.
 */
export function useColorScheme(): 'light' | 'dark' {
  // Get the theme from react-navigation
  const theme = useTheme() as CustomTheme;
  
  // Get the system color scheme as fallback
  const systemColorScheme = _useColorScheme();
  
  // Determine the color scheme
  return theme.dark ? 'dark' : systemColorScheme || 'light';
}
