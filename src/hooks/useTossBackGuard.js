import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Lazy-loads the AppsInToss web framework so plain-web / local dev / Expo
 * environments do not crash on missing native bridge dependencies.
 */
async function loadTossFramework() {
  try {
    return await import('@apps-in-toss/web-framework');
  } catch {
    return null;
  }
}

/**
 * Custom hook to intercept back button events across both the Toss mini-app
 * web environment (graniteEvent) and React Native (BackHandler).
 *
 * @param {() => boolean | void} onBack - Handler callback when back is pressed.
 *   Return `true` to block/consume the back event (prevent default navigation),
 *   or `false` to allow standard back behavior.
 * @param {boolean} [enabled=true] - Whether the back guard is active.
 */
export function useTossBackGuard(onBack, enabled = true) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) return;

    let tossUnsubscribe = null;

    // 1. Toss web framework back event subscription
    loadTossFramework().then(wf => {
      if (wf && wf.graniteEvent && typeof wf.graniteEvent.addEventListener === 'function') {
        try {
          tossUnsubscribe = wf.graniteEvent.addEventListener('backEvent', {
            onEvent: () => {
              if (onBackRef.current) {
                onBackRef.current();
              }
            },
            onError: err => {
              console.warn('[useTossBackGuard] Toss backEvent error:', err);
            },
          });
        } catch {
          // Not running inside actual Toss WebView bridge
        }
      }
    });

    // 2. React Native hardware back press listener (Android / Mobile)
    let rnSubscription = null;
    if (Platform.OS === 'android') {
      const handleHardwareBack = () => {
        if (onBackRef.current) {
          return onBackRef.current();
        }
        return false;
      };
      rnSubscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    }

    return () => {
      if (tossUnsubscribe) {
        try {
          tossUnsubscribe();
        } catch {}
      }
      if (rnSubscription) {
        rnSubscription.remove();
      }
    };
  }, [enabled]);
}
