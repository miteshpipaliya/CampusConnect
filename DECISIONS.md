# Decisions
- Phases 2 and 3 share one development branch at owner request, but merge only after privacy and identity acceptance checks.
- Student email allowlist is controlled by APPROVED_TEST_EMAILS (comma-separated); no personal email is hardcoded.
- Private content is denied unless owner or an active follower, and blocking overrides public/follower access.
- No production migration or indexes are applied from this branch.
