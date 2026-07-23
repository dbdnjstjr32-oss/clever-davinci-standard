import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { Platform } from 'react-native';
import { fontAssets, colors } from './src/theme';
import { store } from './src/data';
import { GraniteNavigator } from './src/navigation/GraniteNavigator';

const navigationRef = createNavigationContainerRef();

// Screens that require a signed-in user
const PROTECTED_ROUTES = ['Path', 'Feed', 'MakerFeed', 'Write', 'StoryDetail', 'Profile', 'Settings'];

SplashScreen.preventAutoHideAsync().catch(() => {});
SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);
  const wasSignedIn = useRef(store.isSignedIn());

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setStyle('light');
    }
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (!document.getElementById('prevent-horizontal-scroll')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'prevent-horizontal-scroll';
        styleEl.textContent = `
          html, body, #root, #root > div {
            width: 100% !important;
            max-width: 100vw !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
            box-sizing: border-box !important;
          }
          * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        `;
        document.head.appendChild(styleEl);
      }
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Handle protected screen redirects upon sign-out or observer mode
  useEffect(() => {
    return store.subscribe(() => {
      const isSignedIn = store.isSignedIn();
      const isObserver = store.isObserver();
      const hasAccess = isSignedIn || isObserver;
      if (wasSignedIn.current && !hasAccess && navigationRef.isReady()) {
        const currentRoute = navigationRef.getCurrentRoute()?.name;
        if (PROTECTED_ROUTES.includes(currentRoute)) {
          navigationRef.reset({ index: 0, routes: [{ name: 'Home' }] });
        }
      }
      wasSignedIn.current = hasAccess;
    });
  }, []);

  // Intercept Toss in-app backEvent globally for React Navigation stack
  useEffect(() => {
    let unsubscribe = null;

    import('@apps-in-toss/web-framework')
      .then(wf => {
        if (wf && wf.graniteEvent && typeof wf.graniteEvent.addEventListener === 'function') {
          unsubscribe = wf.graniteEvent.addEventListener('backEvent', {
            onEvent: () => {
              if (navigationRef.isReady()) {
                if (navigationRef.canGoBack()) {
                  navigationRef.goBack();
                } else {
                  if (wf.closeApp && typeof wf.closeApp === 'function') {
                    wf.closeApp();
                  }
                }
              }
            },
            onError: () => {},
          });
        }
      })
      .catch(() => {});

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {}
      }
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <GraniteNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
