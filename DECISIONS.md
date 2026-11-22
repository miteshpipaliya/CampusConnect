# Phase 1 decisions
- SHA-256 cookie-keyed positive session cache: TTL 60 seconds, max 500 entries per instance; revocation may be delayed up to 60 seconds.
- Rate limits: Firestore transactions, fail open if Firestore is unavailable.
- Cron: daily at 03:00 UTC, missing CRON_SECRET returns 503, deletion disabled until CRON_DELETE_ENABLED=true.
- Legacy counters: subcollections are source of truth; lazy feed backfill for missing/partial counters.
- Media: signed URLs are authorized per media access rules; story URLs capped to story expiry.
- TanStack Query deferred: lockfile requires npm.
- Migration defaults to dry-run; never executed by the assistant.
