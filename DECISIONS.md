# Phase 1 architecture decisions
- Session: positive results cached for up to 60 seconds per server instance, SHA-256 cookie keys, max 500. Revocation may take up to 60 seconds to propagate.
- Rate limiting: transactional Firestore windows; fail open when Firestore is unavailable to preserve existing functionality.
- Cron: once daily for Vercel Hobby compatibility, missing CRON_SECRET fails closed, deletion opt-in only after reviewing dry-run output.
- Legacy counters: backfill lazily and with the migration; likes/comments subcollections remain source of truth.
- TanStack Query: deferred because npm is required to update the lockfile.
- Phase 1B: new server modules are not wired into existing routes until Phase 1C.
