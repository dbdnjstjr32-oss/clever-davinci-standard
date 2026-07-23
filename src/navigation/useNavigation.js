import { useCallback } from 'react';
import { useNavigation as useReactNavigation, useRoute as useReactRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { resolveRouteName, resolvePathName, getRouteAnimationPreset } from './router';

/**
 * Lazy-load Toss web framework haptics/bridge
 */
async function triggerTossHaptics() {
  try {
    const HapticsModule = await import('expo-haptics');
    if (HapticsModule && HapticsModule.impactAsync) {
      await HapticsModule.impactAsync(HapticsModule.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Fallback or non-haptic environment
  }
}

/**
 * Granite-style custom useNavigation hook
 * Provides path-based routing, haptics, and animation options.
 */
export function useNavigation() {
  let navRef;
  let routeRef;

  try {
    navRef = useReactNavigation();
  } catch {
    navRef = null;
  }

  try {
    routeRef = useReactRoute();
  } catch {
    routeRef = null;
  }

  const navigate = useCallback((pathOrName, params = {}, options = {}) => {
    triggerTossHaptics().catch(() => {});
    const targetScreen = resolveRouteName(pathOrName);
    const animationPreset = options.animation || getRouteAnimationPreset(pathOrName);

    if (navRef && navRef.navigate) {
      navRef.navigate(targetScreen, {
        ...params,
        _animationPreset: animationPreset,
      });
    }
  }, [navRef]);

  const push = useCallback((pathOrName, params = {}) => {
    triggerTossHaptics().catch(() => {});
    const targetScreen = resolveRouteName(pathOrName);
    if (navRef && navRef.push) {
      navRef.push(targetScreen, params);
    } else if (navRef && navRef.navigate) {
      navRef.navigate(targetScreen, params);
    }
  }, [navRef]);

  const goBack = useCallback(() => {
    triggerTossHaptics().catch(() => {});
    if (navRef && navRef.canGoBack()) {
      navRef.goBack();
    }
  }, [navRef]);

  const pop = goBack;

  const replace = useCallback((pathOrName, params = {}) => {
    triggerTossHaptics().catch(() => {});
    const targetScreen = resolveRouteName(pathOrName);
    if (navRef && navRef.replace) {
      navRef.replace(targetScreen, params);
    } else if (navRef && navRef.navigate) {
      navRef.navigate(targetScreen, params);
    }
  }, [navRef]);

  const reset = useCallback((pathOrName = '/', params = {}) => {
    triggerTossHaptics().catch(() => {});
    const targetScreen = resolveRouteName(pathOrName);
    if (navRef && navRef.reset) {
      navRef.reset({
        index: 0,
        routes: [{ name: targetScreen, params }],
      });
    }
  }, [navRef]);

  const currentPath = routeRef ? resolvePathName(routeRef.name) : '/';
  const params = routeRef?.params || {};

  return {
    navigate,
    push,
    goBack,
    pop,
    replace,
    reset,
    canGoBack: navRef ? navRef.canGoBack() : false,
    currentPath,
    params,
    rawNav: navRef,
  };
}
