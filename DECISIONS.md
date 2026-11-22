# Phase 1 architecture decisions
- Session: positive results cached for up to 60 seconds per server instance, SHA-256 cookie keys, max 500. Revocation may take up to 60 seconds to propagate.
- Rate limiting: transactional Firestore windows per user and IP; fail open when Firestore is unavailable to preserve existing functionality.
- Cron: once daily for Vercel Hobby compatibility, missing CRON_SECRET fails closed, deletion opt-in only after reviewing dry-run output.
- Legacy counters: lazy backfill on feed reads; likes/comments subcollections remain source of truth.
- TanStack Query: deferred because npm is required to update the lockfile.
- Phase 1C: guarded writes, media validation and presigned URLs wired to routes. Existing media ID fallback retained.
