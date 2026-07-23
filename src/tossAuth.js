import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { app, auth } from './firebase';

// The backend Cloud Function is deployed to this region (must match
// functions/index.js). Kept next to Firestore's Seoul region.
const FUNCTIONS_REGION = 'asia-northeast3';

// Lazily load the AppsInToss web-framework so the plain-web / local-dev bundle
// never evaluates its native-bridge code. Its functions only work inside the
// actual Toss WebView (or the Toss sandbox app); outside, we fall back to the
// dev login path. Wrapped so a load/eval failure just means "not in Toss".
async function loadFramework() {
  try {
    return await import('@apps-in-toss/web-framework');
  } catch {
    return null;
  }
}

/**
 * Detect the runtime context.
 * @returns {Promise<'toss' | 'sandbox' | null>} 'toss'/'sandbox' inside the
 *   Toss app or sandbox; null in a plain browser (local dev / expo web preview).
 */
export async function detectTossEnvironment() {
  const wf = await loadFramework();
  if (!wf || typeof wf.getOperationalEnvironment !== 'function') return null;
  try {
    return wf.getOperationalEnvironment(); // throws when not running inside Toss
  } catch {
    return null;
  }
}

/**
 * Full compliant Toss login:
 *   appLogin() → { authorizationCode, referrer }
 *     → backend `tossLogin` callable (server-side mTLS token exchange + userKey)
 *       → Firebase custom token
 *         → signInWithCustomToken(auth, token)
 * After this resolves, Firebase Auth carries uid = `toss_<userKey>` and all the
 * existing Firestore security rules (request.auth) work unchanged.
 */
export async function signInWithToss() {
  const wf = await loadFramework();
  if (!wf || typeof wf.appLogin !== 'function') {
    throw new Error('토스 앱 환경에서만 로그인할 수 있어요.');
  }

  // Step 1 (client): obtain a one-time authorization code from Toss.
  const { authorizationCode, referrer } = await wf.appLogin();

  // Steps 2-4 (server): the callable exchanges the code over mTLS, reads the
  // userKey, and mints a Firebase custom token. The mini-app never sees the
  // Toss access/refresh tokens.
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const tossLogin = httpsCallable(functions, 'tossLogin');
  const { data } = await tossLogin({ authorizationCode, referrer });
  if (!data || !data.customToken) {
    throw new Error('로그인 토큰 발급에 실패했어요. 잠시 후 다시 시도해 주세요.');
  }

  // Step 5 (client): establish the Firebase session.
  await signInWithCustomToken(auth, data.customToken);
  return auth.currentUser;
}
