# CampusConnect architecture (2026-11-24)

**Web:** Next.js 15 App Router, React 19 and strict TypeScript. Shared social layout is `src/components/social-shell.tsx`; active social pages live in `src/app/(social)/`.

**Identity:** Firebase Auth via Firebase Admin session cookies in `src/lib/server/session.ts`. Mutating API handlers use `guard()` for auth, origin, input validation and Firestore rate limits. Email eligibility and profile privacy are server-enforced.

**Data:** Firestore holds `users`, `handles`, `posts`, `stories`, `follows`, `blocks`, `comments`, `saves`, `notifications`, `reports`, `adminLog`, `dailyStats` and derived feed items. Use explicit bounded queries. `firestore.indexes.json` declares needed composite indexes but does not deploy them.

**Media:** Private Cloudflare R2/S3-compatible storage with server-signed URLs; `src/lib/server/media-urls.ts` checks viewer access before presigning. Upload and video duration checks are separate from rendering.

**Chat:** Stream Chat owns messages, channels, receipts and typing; existing direct messages use server-only signed Stream requests plus an optional client connection for presence and immediate updates. `src/components/chat/stream-connection.tsx` refreshes tokens and has a recoverable connection state. The new group-chat route in branch `12-adudit` uses Stream membership checks and keeps direct messages unchanged. Stream client tokens default off.

**Engagement:** Caption parser and pure helpers in `src/lib/core` are unit-tested via Node strip-types. Posts support comments, likes, Reels, saved collections and lifecycle actions; story tray checks author/expiry and close-friends privacy. Grouped notifications and 99+ badge provide activity.

**Insights and moderation:** Daily stat documents are incrementally written; Dashboard returns 7- or 30-day series. Reports are handled under `/api/admin/reports` with current Firebase custom claims; `adminLog` records moderation decisions.

**Deployment:** GitHub CI runs lint, strict typecheck, unit tests, high/critical dependency audit, Next build and Gitleaks. Vercel builds both preview and production. A Ready preview proves deployment/build, not multi-user acceptance or production correctness.

See `KNOWN_RISKS.md` for bounded fanout, index provisioning, asynchronous Stream/R2 failures and other incomplete verification.
