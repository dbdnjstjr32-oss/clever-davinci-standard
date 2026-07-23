# Academia Atelier — Toss Login backend

This Cloud Function (`tossLogin`) exchanges an AppsInToss **Toss Login**
authorization code for a **Firebase custom token**, so the mini-app can sign in
to Firebase (and keep using the existing Firestore security rules) while
complying with the AppsInToss "Toss login only" policy.

## Architecture

```
client appLogin()  →  { authorizationCode, referrer }
      →  tossLogin (this fn)
            POST /oauth2/generate-token  (mTLS)  → accessToken
            GET  /oauth2/login-me        (mTLS)  → userKey
            admin.createCustomToken("toss_<userKey>")
      →  client signInWithCustomToken(token)
```

`src/tossAuth.js` in the app calls this via `httpsCallable(functions, 'tossLogin')`.

## Prerequisites (all outside the code — do these first)

1. **Blaze plan** — Cloud Functions require the Firebase pay-as-you-go plan.
   Upgrade at: Firebase console → ⚙️ → Usage and billing → Modify plan.
2. **Toss Login contract + config** in the AppsInToss console
   (약관 동의 → scope/약관/연결-끊기 콜백 설정 → 복호화 키 발급).
3. **mTLS client certificate** issued by Toss. Store as Functions secrets:
   ```sh
   firebase functions:secrets:set TOSS_MTLS_CERT   # paste PEM certificate
   firebase functions:secrets:set TOSS_MTLS_KEY    # paste PEM private key
   ```

## Deploy

```sh
cd functions && npm install
cd .. && firebase deploy --only functions --project davinchi-7b7cf
```

## Notes

- `createCustomToken` needs the runtime service account to have the
  **Service Account Token Creator** role (default Functions SA usually does; if
  you hit `iam.serviceAccounts.signBlob` errors, grant it explicitly).
- The uid format is `toss_<userKey>`; `userKey` is unique **per app**, so the
  same person gets the same uid on every login.
- `login-me` also returns encrypted name/email/phone. If you later persist any
  of it, decrypt server-side with the console 복호화 키 (AES-256-GCM) and write
  it from the function — never hand encrypted PII to the client.
