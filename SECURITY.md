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
