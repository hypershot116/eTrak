import "../../global.css";
import { initSync } from '@/lib/sync-engine';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { captureGoogleRedirect } from '@/lib/google-auth';
import { ThemeRoot } from '@/theme/theme-root';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  useEffect(() => {
    captureGoogleRedirect().finally(() => {
      initSync();
    });
  }, []);
  return (
    <ThemeRoot>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </ThemeRoot>
  );
}
