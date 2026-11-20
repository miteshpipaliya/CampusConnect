# CampusConnect Firebase + Cloudflare R2 integration

## Credentials
- All Firebase Admin and R2 credentials are **server-side Vercel environment variables**.
- No real key or project identifier is committed to GitHub.
- Do not import files under src/lib/server into a client component.
- The existing variable NEXT_PUBLIC_FIREBASE_API_KEY is read *only* in a server route for Firebase Identity Toolkit. Prefer renaming it to FIREBASE_WEB_API_KEY in Vercel after a planned code/config rollout; NEXT_PUBLIC_ variables must never be imported into client bundles.
- .env.local and credential JSON files are ignored. .env.example contains empty names only.

## Implemented
- Email/password signup and sign-in, email verification through Firebase Auth REST API.
- HttpOnly, SameSite=Lax, Secure (in production) Firebase session cookies.
- Admin SDK verifies every session; direct Firestore client access stays denied.
- Authenticated posts in Firestore; private R2 bucket with temporary signed upload/download URLs.
- Media owner checks and HEAD metadata validation; same-origin checks for cookie-bearing writes.
- Public health endpoint /api/integrations/health returns only boolean connectivity status.

## Important security and functionality limitations
- Google Sign-In is enabled in Firebase Console but **not yet wired to the website**. It needs OAuth setup.
- The current other navigation pages are still demo-only. Only login/registration/home feed use these new server routes.
- Image/video content requires actual file signature verification, malware scanning and moderation before accepting real student uploads.
- R2 CORS must allow PUT from the exact Vercel hostname and Content-Type header; retain private bucket access.
- No strong shared IP/user rate limiting, college membership verification, verified moderation, deletion workflows, CSRF token defense in depth, or full data retention policies yet.
- Security Rules deny direct Firestore access; the Admin SDK bypasses them, making server authorization critical.
- Use a separate production Firebase project and bucket before a public student rollout. The current Vercel Production variables point to development infrastructure.
- CSP permits inline scripts for Next.js; migrate to nonce-based CSP before a full launch.
- Do not claim external credentials work until the deployed health endpoint confirms them.

- GitHub Actions temporarily runs `npm install` because the new dependencies need a refreshed committed package-lock; sync the lock before enforcing `npm ci` again.

## Student identity milestone
- BVM email convention is provisional and does not establish actual enrollment. Codes require college verification.
- Registration requires relationship status, visibility, terms and privacy acknowledgements.
- Existing users need a migration/onboarding path before new login rules can be deployed.
- Health endpoint catches synchronous Firebase initialization failures.
- Keep ESLint 9 with eslint-config-next 15; do not merge ESLint 10.
