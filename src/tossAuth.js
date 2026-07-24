import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { app, auth } from './firebase';

// The backend Cloud Function is deployed to this region (must match
// functions/index.js). Kept next to Firestore's Seoul region.
const FUNCTIONS_REGION = 'asia-northeast3';

/**
 * Master switch for "can a user actually sign in right now?".
 *
 * Flipped to `true` on 2026-07-24 once the backend went live: Blaze plan
 * active, mTLS cert/key + ANON_UID_PEPPER secrets set, and `anonKeyLogin`
 * deployed to asia-northeast3 (confirmed via functions:list). Before that,
 * this stayed `false` so the app offered observer (read-only) entry instead of
 * a login button that could only fail.
 *
 * There is deliberately no fallback sign-in path behind this flag; every
 * account must come from a server-verified Toss identity. If this ever needs
 * to go back to `false` (e.g. the callable is removed or broken), flip it back
 * in the same change - never leave a dangling login button with no backend.
 */
export const ANON_LOGIN_ENABLED = true;

// Login-related copy lives next to the flag so the two can never drift: when
// the flag flips, every "준비 중" string flips with it.
export const LOGIN_COPY = ANON_LOGIN_ENABLED
  ? {
      title: '학자로 입장하기',
      subtitle:
        '토스로 한 번에 입장해요.\n실패담은 익명 닉네임으로 전시되며, 토스 계정 정보는 공개되지 않아요.',
      cta: '토스로 시작하기',
      gateTitle: '여기까지가 관찰자 무료 관람입니다',
      gateSubtitle: '토스로 입장하면',
      gateCta: '토스로 입장하기 →',
      observerBanner: '👁️ 관찰자 모드 (읽기 전용) · 토스로 입장 →',
    }
  : {
      title: '학자로 입장하기',
      subtitle:
        '입장 기능을 준비하고 있어요.\n지금은 관찰자로 아카데미아를 둘러볼 수 있어요.',
      cta: '입장 준비 중',
      gateTitle: '여기까지가 관찰자 무료 관람입니다',
      gateSubtitle: '입장 기능이 열리면',
      gateCta: '입장 준비 중',
      observerBanner: '👁️ 관찰자 모드 (읽기 전용) · 입장 기능 준비 중',
    };

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

// Small helper so every failure path carries a machine-readable code that
// AuthScreen's TOSS_ERROR_MESSAGES maps to user-facing copy. Errors thrown by
// httpsCallable already carry `functions/*` codes and pass through untouched.
function authError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

/**
 * Sign in with the AppsInToss "사용자 식별키" (anonymous user key).
 *
 *   getAnonymousKey() → { type: 'HASH', hash }
 *     → backend `anonKeyLogin` callable (server verifies the hash over mTLS,
 *        derives uid = `anon_<hmac>`, mints a Firebase custom token)
 *       → signInWithCustomToken(auth, token)
 *
 * We use the anonymous key rather than Toss Login (`appLogin`) because Toss
 * Login requires a business registration this project can't obtain; the app is
 * anonymous-nickname-based, so it needs no name/email/phone anyway. The raw
 * hash is treated as a secret and only ever handed to the callable - never
 * stored or logged client-side.
 *
 * After this resolves, Firebase Auth carries uid = `anon_<hmac>` and all the
 * existing Firestore security rules (request.auth) work unchanged.
 */
export async function signInWithToss() {
  const wf = await loadFramework();
  if (!wf || typeof wf.getAnonymousKey !== 'function') {
    throw authError('toss/unavailable', '토스 앱 환경에서만 입장할 수 있어요.');
  }

  // Step 1 (client): get this user's per-mini-app identifier. Handle every
  // documented outcome of getAnonymousKey explicitly.
  const result = await wf.getAnonymousKey();
  if (result === undefined) {
    // Toss app / SDK below the minimum that supports the bridge.
    throw authError('toss/sdk-outdated', '토스 앱을 업데이트하면 입장할 수 있어요.');
  }
  if (result === 'INVALID_CATEGORY') {
    // Called from a game-category mini-app - a console setup error, not a user one.
    throw authError('toss/invalid-category', '입장 설정에 문제가 있어요.');
  }
  if (result === 'ERROR' || !result || result.type !== 'HASH' || !result.hash) {
    throw authError('toss/unavailable', '토스에서 입장 정보를 받지 못했어요.');
  }

  // Step 2 (server): verify the hash over mTLS and mint a Firebase custom token.
  // The mini-app never sees anything but the token.
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const anonKeyLogin = httpsCallable(functions, 'anonKeyLogin');
  const { data } = await anonKeyLogin({ hash: result.hash });
  if (!data || !data.customToken) {
    throw authError('functions/unavailable', '입장 토큰 발급에 실패했어요.');
  }

  // Step 3 (client): establish the Firebase session.
  await signInWithCustomToken(auth, data.customToken);
  return auth.currentUser;
}
