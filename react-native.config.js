/**
 * This project uses the AppsInToss **WebView** integration path
 * (`@apps-in-toss/web-framework`'s web-only `appLogin`/
 * `getOperationalEnvironment`), never the native "Granite" runtime. Two
 * unrelated things nonetheless drag Granite-only native code into
 * Expo/React Native's autolinking for a plain `expo run:android`/`run:ios`
 * build, breaking native compilation against this app's actual (much newer)
 * React Native core:
 *
 * 1. `brick-module` / `@granite-js/*` - Toss's native Granite app runtime.
 *    Not a real dependency of this app; it's only present because several
 *    `@apps-in-toss/*` / `@toss/tds-react-native` packages declare
 *    `"brick-module": "*"` etc. as PEER dependencies, which npm 7+
 *    auto-installs even though nothing here imports them.
 * 2. `@apps-in-toss/plugin-compat` (a real dependency of web-framework, used
 *    for its web-bundling compat layer) vendors its own OLD, npm-aliased
 *    copies of RN ecosystem packages - e.g. `react-native-screens-3.27.0`
 *    really is `react-native-screens@3.27.0` under a different folder name -
 *    so plugin-compat's web-only shims have a known-good set to target. These
 *    aliased copies still ship real android/ios folders and get autolinked
 *    too, even though they're for Metro's web bundle only.
 *
 * Either category, once autolinked, tries to compile against Fabric-era APIs
 * (`FabricViewStateManager`, `ChoreographerCompat`, ...) that don't exist in
 * this app's actual React Native version, causing native build failures.
 * Disabling native autolinking for all of them below fixes native builds
 * without touching any upstream package.
 *
 * Re-check the currently autolinked set (and whether new entries need adding
 * here after a dependency upgrade) with:
 *   npx expo-modules-autolinking react-native-config --json
 */
const disabledNativeLinking = { platforms: { android: null, ios: null } };

const graniteNativeRuntimePackages = [
  'brick-module',
  '@granite-js/image',
  '@granite-js/video',
  '@granite-js/lottie',
];

// From: node -e "const d=require('./node_modules/@apps-in-toss/plugin-compat/package.json').dependencies; Object.keys(d).filter(k=>/npm:/.test(d[k])).forEach(k=>console.log(k))"
const pluginCompatAliasedPackages = [
  '@react-native-async-storage/async-storage-1.18.2',
  '@react-native-community/blur-4.3.2',
  '@react-native/codegen-0.72.6',
  '@react-native/js-polyfills-0.72.1',
  '@react-native/normalize-colors-0.72.0',
  '@react-navigation/elements-1.3.9',
  '@react-navigation/native-6.0.13',
  '@react-navigation/native-stack-6.9.0',
  '@shopify/flash-list-1.6.2',
  'lottie-react-native-6.4.0',
  'react-18.2.0',
  'react-dom-18.2.0',
  'react-native-0.72.6',
  'react-native-fast-image-8.6.3',
  'react-native-gesture-handler-2.8.0',
  'react-native-pager-view-6.1.2',
  'react-native-safe-area-context-4.7.4',
  'react-native-screens-3.27.0',
  'react-native-svg-13.14.0',
  'react-native-video-6.0.0-alpha.6',
  'react-native-webview-13.6.3',
];

module.exports = {
  dependencies: Object.fromEntries(
    [...graniteNativeRuntimePackages, ...pluginCompatAliasedPackages].map(name => [
      name,
      disabledNativeLinking,
    ])
  ),
};
