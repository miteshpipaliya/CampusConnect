# CampusConnect — known risks and audit boundaries

- Frontend-only demo, with fictional accounts and browser-local data. No real account authentication, privacy controls, messaging security, classmate verification, moderation, or persistent multi-user features.
- No Supabase or Firebase database connection in the migrated application. Do not copy database environment variables from older Vercel projects.
- CSP currently uses unsafe-inline for Next.js bootstrap scripts; replace with a nonce-based policy for production authentication.
- Example videos and external Unsplash images require a licensing/availability review before commercial launch.
- GitHub main branch was unprotected at the time of audit. A ruleset and required status checks must be configured by the repository administrator.
- The GitHub connector does not support deleting branches or changing repository rulesets. Old Dependabot branches require manual deletion after their PRs are closed. Removing version-update configuration prevents future automatic version-update PR branches, but GitHub security updates can still require review.
- CI checks lint, typecheck, tests, npm audit high/critical, build and Gitleaks. This is not a substitute for adversarial tests, penetration testing or production security review.
