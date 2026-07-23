/**
 * AppsInToss "Toss Login" -> Firebase custom token exchange.
 *
 * Flow (see https://developers-apps-in-toss.toss.im/login/develop.html):
 *   client appLogin() -> { authorizationCode, referrer }
 *     -> [this function] POST generate-token (mTLS)  -> accessToken
 *     -> [this function] GET  login-me      (mTLS)  -> userKey
 *     -> [this function] admin.createCustomToken(`toss_<userKey>`)
 *   client signInWithCustomToken(token)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * BEFORE THIS CAN RUN (all gated on the user / console — not code):
 *   1. Firebase project must be on the **Blaze** plan (Cloud Functions).
 *   2. Toss Login must be contracted + configured in the AppsInToss console
 *      (약관 동의, scope, 약관 등록, 연결 끊기 콜백).
 *   3. An **mTLS client certificate** must be issued by Toss and stored as
 *      Functions secrets, e.g.:
 *        firebase functions:secrets:set TOSS_MTLS_CERT   # PEM cert
 *        firebase functions:secrets:set TOSS_MTLS_KEY    # PEM private key
 *   4. Deploy:  firebase deploy --only functions
 * ─────────────────────────────────────────────────────────────────────────
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const https = require('https');

initializeApp();

// mTLS client identity issued by Toss. Set via `firebase functions:secrets:set`.
const TOSS_MTLS_CERT = defineSecret('TOSS_MTLS_CERT');
const TOSS_MTLS_KEY = defineSecret('TOSS_MTLS_KEY');

const TOSS_API_HOST = 'apps-in-toss-api.toss.im';
const REGION = 'asia-northeast3';

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
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

exports.tossLogin = onCall(
  { region: REGION, secrets: [TOSS_MTLS_CERT, TOSS_MTLS_KEY] },
  async request => {
    const { authorizationCode, referrer } = request.data || {};
    if (!authorizationCode || !referrer) {
      throw new HttpsError('invalid-argument', 'authorizationCode와 referrer가 필요해요.');
    }

    const cert = TOSS_MTLS_CERT.value();
    const key = TOSS_MTLS_KEY.value();
    if (!cert || !key) {
      throw new HttpsError('failed-precondition', 'mTLS 인증서가 설정되지 않았어요.');
    }

    // 1) authorizationCode -> accessToken
    const tokenRes = await tossRequest({
      method: 'POST',
      path: '/api-partner/v1/apps-in-toss/user/oauth2/generate-token',
      cert,
      key,
      body: { authorizationCode, referrer },
    });
    const accessToken = tokenRes.json?.success?.accessToken;
    if (!accessToken) {
      console.error('generate-token failed', tokenRes.status, tokenRes.raw);
      throw new HttpsError('unauthenticated', '토스 토큰 발급에 실패했어요.');
    }

    // 2) accessToken -> userKey
    const meRes = await tossRequest({
      method: 'GET',
      path: '/api-partner/v1/apps-in-toss/user/oauth2/login-me',
      cert,
      key,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userKey = meRes.json?.success?.userKey;
    if (userKey == null) {
      console.error('login-me failed', meRes.status, meRes.raw);
      throw new HttpsError('unauthenticated', '토스 사용자 정보를 가져오지 못했어요.');
    }

    // 3) userKey -> Firebase custom token. uid namespaced to avoid colliding
    //    with any Firebase auto-generated uids.
    const uid = `toss_${userKey}`;
    const customToken = await getAuth().createCustomToken(uid, {
      provider: 'toss',
      userKey,
    });

    // NOTE: Toss also returns encrypted name/email/phone from login-me. If you
    // later want to persist any of those, decrypt them here with the console
    // 복호화 키 (AES-256-GCM) and write them server-side — never send the
    // encrypted PII to the client.
    return { customToken };
  }
);
