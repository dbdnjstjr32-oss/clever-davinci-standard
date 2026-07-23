import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Public web config (apiKey etc. are not secrets - Firebase security comes
// from Firestore/Auth rules, not from hiding this object). From:
// npx firebase-tools@latest apps:sdkconfig WEB 1:995517351440:web:dbb8e9bd6edb06eb762c95 --project davinchi-7b7cf
const firebaseConfig = {
  apiKey: 'AIzaSyAx81cRKAeqScS37QGSf6o97yabTO_LSpk',
  authDomain: 'davinchi-7b7cf.firebaseapp.com',
  projectId: 'davinchi-7b7cf',
  storageBucket: 'davinchi-7b7cf.firebasestorage.app',
  messagingSenderId: '995517351440',
  appId: '1:995517351440:web:dbb8e9bd6edb06eb762c95',
  measurementId: 'G-E4MW9910Q4',
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Web (incl. the AppsInToss WebView export) uses the SDK's default browser
// persistence. Native iOS/Android needs an explicit AsyncStorage-backed
// persistence or the signed-in session won't survive an app restart.
function createAuth() {
  if (Platform.OS === 'web') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (e) {
    // initializeAuth throws if it was already called for this app (e.g. Fast
    // Refresh re-running this module) - fall back to the existing instance.
    return getAuth(app);
  }
}

export const auth = createAuth();

// This project's Firestore is an Enterprise-edition database created with a
// non-default id ('academia-atelier'), so it must be named explicitly here -
// getFirestore(app) alone would try to reach a '(default)' database that
// doesn't exist for this project.
export const db = getFirestore(app, 'academia-atelier');
