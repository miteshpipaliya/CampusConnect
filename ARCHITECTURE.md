# CampusConnect architecture
Next.js 15 App Router, Firebase Auth Admin session cookies, Firestore for student profiles/posts/stories, private R2 S3-compatible object storage, and Stream chat.
Pure functions live in src/lib/core and are tested by Node strip-types. Server-only integrations live in src/lib/server.
Phase 1B introduces optional storage abstraction, SHA-256 session cache, transaction-based rate limiting, guard, URL minting and daily cleanup cron. Phase 1C will wire them into routes.
Older demo UI modules may still use local browser state; not all UI interactions are persisted. Never treat demo content as authoritative production data.
