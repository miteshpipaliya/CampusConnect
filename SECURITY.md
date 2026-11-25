# CampusConnect security

CampusConnect is an authenticated campus application, not a frontend-only demo. Its live code integrates Firebase Admin sessions, Firestore, private R2 and Stream Chat. **No claim is made that this is fully security audited or penetration tested.**

## Security controls
- API writes validate signed-in sessions, same-origin requests, schemas and rate limits via `guard()`. GETs use server session access checks.
- Posts/stories/media check private-account followers, blocks and close-friends rules on the server. Group-chat APIs verify membership and deny group creation when members block the owner.
- Firebase Admin custom claim `admin=true` is required for moderation actions; clients cannot grant themselves admin privileges. Moderation writes use `adminLog`. Run `scripts/set-admin.mjs` only in an owner-controlled environment and never add service account keys to GitHub.
- Cloudflare R2 keys and `STREAM_API_SECRET` must be server-only. Chat-client tokens are disabled by default and generated via an authenticated opt-in endpoint.
- CSP, HSTS, nosniff, COOP, framing restrictions and referrer restrictions are configured in `next.config.js`. `unsafe-inline` remains in script/style policy for Next.js; a nonce-based CSP migration is future work.
- CI includes pinned actions, lint, typecheck, unit tests, production build, high/critical npm audit and Gitleaks. These are gates, not proof of authorization or data privacy.

## Required operator checks
Use distinct test accounts and verify follow/private/block/mute/close-friends media access, reports/moderation, Stream channel permissions, group membership/leave, token refresh and R2 signed downloads. See `docs/MANUAL_QA.md`. Review GitHub branch rulesets and deployment permissions. Keep `STREAM_CLIENT_TOKENS_ENABLED=false` until two-user acceptance and Stream permission review.

## Audit branch
`12-adudit` and draft PR #34 change both UI and backend behavior and are **not approved for production** without staging acceptance. External Firestore indexes and operator credentials are not modified by the PR.

## sec-audit controls
Auth throttles fail closed immediately. Revoked cookie hashes are persisted for five days and checked on every authenticated request; cron cleanup respects dry run. No public session cache. Optional CSP_NONCE=1 requires OWNER-VERIFY on dynamically rendered pages; default remains off. Verify cross-instance logout, password reset, account restoration, and Stream token revocation with test accounts before merging. HSTS preload directive does not itself submit the domain to the preload list.
