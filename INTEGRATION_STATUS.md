# Integration status
Firebase Auth, Firestore, R2 media and Stream Chat are configured via server-side environment variables; actual connectivity is deployment-dependent.
Phase 1A pure foundation is merged. Phase 1B adds optional server foundations but is not yet wired into existing write routes.
Cron is disabled without CRON_SECRET; destructive cleanup disabled without CRON_DELETE_ENABLED=true.
Storage defaults to existing R2_* env; optional S3/B2 needs S3_* env.
TanStack Query is deferred until package-lock is regenerated with npm.
Do not execute migration --apply without owner review. Do not commit credentials.

## Current release-readiness branch
- GitHub PR #22 integrates the content-pipeline work, REST chat with Stream SDK v10.2.0 browser integration, authenticated token endpoint and privacy-gated presence events, R2 attachment claims and signed reads, reactions, replies, sharing, search and notifications.
- npm lockfile regenerated; CI installs using `npm ci`. Actual Stream/R2 connectivity has NOT been demonstrated with two authorized test accounts.
- Stream requires `STREAM_API_KEY`, `STREAM_API_SECRET`; `STREAM_CLIENT_TOKENS_ENABLED` remains an optional, default-off activation gate. Firebase session and private R2 configuration remain required.
- Vercel preview must be READY for exact final SHA; earlier previews do not satisfy acceptance. Do not modify production environment, payment plan, data or indexes without owner approval.
