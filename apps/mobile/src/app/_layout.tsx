import "../../global.css";
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ThemeRoot } from '@/theme/theme-root';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  return (
    <ThemeRoot>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </ThemeRoot>
  );
}
