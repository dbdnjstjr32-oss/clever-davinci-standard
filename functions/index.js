/**
 * AppsInToss "사용자 식별키(getAnonymousKey)" -> Firebase custom token exchange.
 *
 * Flow (see https://developers-apps-in-toss.toss.im/user-hash-key/develop.html):
 *   client getAnonymousKey() -> { type: 'HASH', hash }
 *     -> [anonKeyLogin] POST users/anon-key/verify (mTLS, header x-anon-key)
 *          -> { resultType: 'SUCCESS', success: 'true' } means the hash is a
 *             real Toss-issued key; 401 means it isn't -> reject
 *     -> uid = 'anon_' + HMAC-SHA256(hash, ANON_UID_PEPPER)
 *     -> admin.createCustomToken(uid)
 *   client signInWithCustomToken(token)
 *
 * WHY NOT Toss Login (appLogin): Toss Login requires a business registration
 * (사업자 등록), which this project's owner cannot obtain. AppsInToss support
 * confirmed (2026-07-24) that the anonymous user key needs no business
 * registration and may be the sole identity, as long as no other external /
 * social login is layered on top. The original appLogin/tossLogin exchange is
 * preserved (commented out) at the bottom of this file for reference only - it
 * must NOT be deployed for this project.
 *
 * WHY the hash is not used directly as the uid: `posts.authorUid` is a public,
 * world-readable field (see firestore.rules), so putting the raw hash in the
 * uid would publish it. Anyone who learns a hash can sign in as that user, so
 * the hash is a secret: we derive the uid via an HMAC with a server-only
 * pepper, and never log/return/store the raw hash.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * BEFORE THIS CAN RUN (all gated on the user / console — not code):
 *   1. Firebase project must be on the **Blaze** plan (Cloud Functions).
 *   2. An **mTLS client certificate** issued in the AppsInToss console
 *      (콘솔 → 앱 → mTLS 인증서 → 발급받기), stored as Functions secrets:
 *        firebase functions:secrets:set TOSS_MTLS_CERT   # PEM cert
 *        firebase functions:secrets:set TOSS_MTLS_KEY    # PEM private key
 *   3. A **server-only pepper** for deriving uids from the hash:
 *        firebase functions:secrets:set ANON_UID_PEPPER  # openssl rand -hex 32
 *      NEVER rotate ANON_UID_PEPPER: every user's uid is derived from it, so
 *      changing it orphans every existing account.
 *   4. Deploy:  firebase deploy --only functions
 * ─────────────────────────────────────────────────────────────────────────
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const https = require('https');
const crypto = require('crypto');

initializeApp();

// mTLS client identity issued by Toss (shared by every partner API call).
const TOSS_MTLS_CERT = defineSecret('TOSS_MTLS_CERT');
const TOSS_MTLS_KEY = defineSecret('TOSS_MTLS_KEY');
// Server-only secret mixed into the hash before it becomes a uid. See the
// header note: this is what keeps the raw hash out of the public authorUid.
const ANON_UID_PEPPER = defineSecret('ANON_UID_PEPPER');

const TOSS_API_HOST = 'apps-in-toss-api.toss.im';
const REGION = 'asia-northeast3';
// Hard ceiling on how long we'll wait on the Toss API before failing, so a
// hung upstream can't pin a function instance for the full 20s timeout.
const TOSS_API_TIMEOUT_MS = 10000;

// Minimal HTTPS request that presents the mTLS client cert/key on every call.
function tossRequest({ method, path, cert, key, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        host: TOSS_API_HOST,
        method,
        path,
        cert, // client certificate (mTLS)
        key, // client private key (mTLS)
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch {
            /* leave json null; surfaced below */
          }
          resolve({ status: res.statusCode, json, raw: data });
        });
      }
    );
    // Fail fast instead of hanging on an unresponsive upstream. destroy() emits
    // 'error', which rejects this promise below.
    req.setTimeout(TOSS_API_TIMEOUT_MS, () => {
      req.destroy(new Error('toss-api-timeout'));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

exports.anonKeyLogin = onCall(
  {
    region: REGION,
    secrets: [TOSS_MTLS_CERT, TOSS_MTLS_KEY, ANON_UID_PEPPER],
    // Bounds Blaze cost/blast-radius; App Check is intentionally omitted because
    // reCAPTCHA-family attestation is unreliable inside the Toss WebView. The
    // verify call + this cap are the defense instead.
    maxInstances: 10,
    timeoutSeconds: 20,
  },
  async request => {
    const { hash } = request.data || {};
    // The hash's exact format/length is undocumented (open question to Toss),
    // so validate only what we're sure of: a non-empty, bounded string. The
    // verify call below is the real authority on validity.
    if (typeof hash !== 'string' || hash.length === 0 || hash.length > 4096) {
      throw new HttpsError('invalid-argument', '유효하지 않은 요청이에요.');
    }

    const cert = TOSS_MTLS_CERT.value();
    const key = TOSS_MTLS_KEY.value();
    const pepper = ANON_UID_PEPPER.value();
    if (!cert || !key || !pepper) {
      throw new HttpsError('failed-precondition', '입장 기능이 아직 준비되지 않았어요.');
    }

    // 1) Verify the hash is a genuine Toss-issued key. mTLS + x-anon-key header;
    //    empty body (matches the documented curl `-d ''`).
    const verifyRes = await tossRequest({
      method: 'POST',
      path: '/api-partner/v1/apps-in-toss/users/anon-key/verify',
      cert,
      key,
      headers: { 'x-anon-key': hash, accept: 'application/json' },
    });
    // Judge on `resultType`, the authoritative flag in Toss's common envelope.
    // Probed 2026-07-24: a bad key returns HTTP 200 with
    //   {resultType:'FAIL', success:null, error:{errorCode:'4010', ...}}
    // - NOT the HTTP 401 the docs imply, and `success` is null (not a string)
    // on failure. Keying off resultType avoids rejecting a real key just
    // because the `success` field's type differs from the documented "true".
    const verified = verifyRes.json?.resultType === 'SUCCESS';
    if (!verified) {
      // Never log the hash itself - it's a bearer secret. Status + errorCode only.
      console.error('anon-key verify rejected', verifyRes.status, verifyRes.json?.error?.errorCode);
      throw new HttpsError('unauthenticated', '사용자 확인에 실패했어요.');
    }

    // 2) hash -> uid via HMAC with the server-only pepper. One-way, so the raw
    //    hash never reaches Firestore (where authorUid is world-readable).
    const digest = crypto.createHmac('sha256', pepper).update(hash).digest('hex');
    const uid = `anon_${digest.slice(0, 40)}`;

    // 3) Mint the Firebase session. Same uid on every login for a given hash,
    //    so the existing request.auth-based security rules work unchanged.
    const customToken = await getAuth().createCustomToken(uid, { provider: 'toss-anon' });
    return { customToken };
  }
);

// ─────────────────────────────────────────────────────────────────────────
// REFERENCE ONLY — Toss Login (appLogin) exchange. NOT exported / NOT deployed.
// Requires a business registration this project can't obtain (see header). Kept
// so the compliant server-side token exchange isn't lost if the situation ever
// changes. To use it: obtain 사업자 등록, complete the Toss Login console setup,
// then re-export as `exports.tossLogin`.
//
// exports.tossLogin = onCall(
//   { region: REGION, secrets: [TOSS_MTLS_CERT, TOSS_MTLS_KEY] },
//   async request => {
//     const { authorizationCode, referrer } = request.data || {};
//     if (!authorizationCode || !referrer) {
//       throw new HttpsError('invalid-argument', 'authorizationCode와 referrer가 필요해요.');
//     }
//     const cert = TOSS_MTLS_CERT.value();
//     const key = TOSS_MTLS_KEY.value();
//     if (!cert || !key) {
//       throw new HttpsError('failed-precondition', 'mTLS 인증서가 설정되지 않았어요.');
//     }
//     // authorizationCode -> accessToken
//     const tokenRes = await tossRequest({
//       method: 'POST',
//       path: '/api-partner/v1/apps-in-toss/user/oauth2/generate-token',
//       cert, key,
//       body: { authorizationCode, referrer },
//     });
//     const accessToken = tokenRes.json?.success?.accessToken;
//     if (!accessToken) {
//       throw new HttpsError('unauthenticated', '토스 토큰 발급에 실패했어요.');
//     }
//     // accessToken -> userKey
//     const meRes = await tossRequest({
//       method: 'GET',
//       path: '/api-partner/v1/apps-in-toss/user/oauth2/login-me',
//       cert, key,
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });
//     const userKey = meRes.json?.success?.userKey;
//     if (userKey == null) {
//       throw new HttpsError('unauthenticated', '토스 사용자 정보를 가져오지 못했어요.');
//     }
//     const uid = `toss_${userKey}`;
//     const customToken = await getAuth().createCustomToken(uid, { provider: 'toss', userKey });
//     return { customToken };
//   }
// );
