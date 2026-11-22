# Decisions
- Phases 2 and 3 share one development branch at owner request, but merge only after privacy and identity acceptance checks.
- Student email allowlist is controlled by APPROVED_TEST_EMAILS (comma-separated); no personal email is hardcoded.
- Private content is denied unless owner or an active follower, and blocking overrides public/follower access.
- No production migration or indexes are applied from this branch.

## Phase 2 completion safeguards
- Direct Stream client JWTs are disabled by default (STREAM_CLIENT_TOKENS_ENABLED). Server-backed chat remains available.
- Stream user blocking is mirrored via the Stream block API. Stream's two-way effect is a dashboard setting requiring owner verification.
- Account delete disables Firebase Auth and queues a 30-day retention period. Physical purging needs BOTH CRON_DELETE_ENABLED and CRON_PURGE_ACCOUNTS_ENABLED set to true after operator review. Stream async deletion must confirm completed before Firebase profile removal.
- Firestore collection-group indexes for likes/comments/notifications are in firestore.indexes.json but need explicit owner deployment.
- Story audience and signed-media reads check close-friends membership on the server.
- New static security checks are regressions tests, not a substitute for two real user accounts and a Stream/R2 integration test.
