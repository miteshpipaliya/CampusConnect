# Integration status
Firebase Auth, Firestore, R2 media and Stream Chat are configured via server-side environment variables; actual connectivity is deployment-dependent.
Phase 1A pure foundation is merged. Phase 1B adds optional server foundations but is not yet wired into existing write routes.
Cron is disabled without CRON_SECRET; destructive cleanup disabled without CRON_DELETE_ENABLED=true.
Storage defaults to existing R2_* env; optional S3/B2 needs S3_* env.
TanStack Query is deferred until package-lock is regenerated with npm.
Do not execute migration --apply without owner review. Do not commit credentials.
