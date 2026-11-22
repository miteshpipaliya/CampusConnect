# CampusConnect security — frontend-only demo

## Scope

CampusConnect is a **public demo with fictional content**, not an authenticated social network. It does **not** connect to Supabase, Firebase, a database, or an upload backend. Any likes, follows, posts, settings, or messages are browser-local UI state and **not private, authenticated, or enforced server-side**. Do not enter real student details, passwords, confidential messages, or sensitive content.

## Controls in source

- No database SDK or credentials required. The GitHub repository was initialized with fresh history.
- GitHub Actions uses read-only permissions, pinned action commits, lint, typecheck, tests, production build, npm audit (high/critical gate), and Gitleaks scanning.
- HTTP response headers include CSP, HSTS, X-Frame-Options, no-sniff, restrictive Permissions-Policy, and COOP.
- CSP restricts remote media to explicit demo providers. **It currently allows inline scripts and styles for Next.js hydration**, so it is not a strict nonce-based XSS policy. Do not claim otherwise.
- Demo file previews are local object URLs; the app does not send them to a server. Client-side size and MIME checks are UX guards, **not a secure upload validation pipeline**.

## Required before real users

- Introduce authenticated accounts, server-side authorization, rate limits, input validation, privacy enforcement, abuse reports, moderation, and safe media processing.
- Use server-issued CSP nonces and remove unsafe-inline from script-src; validate all third-party media licenses and privacy terms.
- Configure GitHub main-branch ruleset requiring PR review, passing quality and secret-scan checks, no force pushes or deletion, and least-privilege collaborator access.
- Review dependency advisories including moderate severity, and run browser-based security/accessibility tests.
- Keep Dependabot security alerts enabled in GitHub Settings → Security & analysis. Version-update automation was removed to honor the one-branch request; check for security updates manually.

**Audit status:** CI passing is necessary but does not prove a full penetration test or a production-ready secure social network.

## Release-readiness branch — current scope (2026-11-22)
The earlier 'frontend-only demo' paragraphs document the original prototype and are NOT an accurate description of PR #22. The current code authenticates with Firebase Admin session cookies, authorizes server routes, stores app data in Firestore, uses signed private R2 media, and integrates Stream Chat. **Do not treat the branch as production security verified.**

For chat: Stream tokens are minted only by the session-protected POST `/api/chat/token` route and gated by `STREAM_CLIENT_TOKENS_ENABLED`. No Stream secret belongs in the browser. Server checks bilateral blocks and message ownership; private chat media is associated with sender, peer and message before access. Activity presence requires an opt-in and server-side visibility gate; Stream user visibility uses a partial update. Validate Stream application permissions for client users in a non-production Stream environment, including member-only channel access and two-way blocking, before enabling tokens. Current unit tests and CI are not a substitute for two-account authorization tests.
