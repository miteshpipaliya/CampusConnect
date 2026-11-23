# CampusConnect

CampusConnect is an Instagram-inspired private BVM campus social application. It uses **Next.js 15 / React 19, Firebase Authentication and Firestore, private Cloudflare R2 media storage, and Stream Chat**. The active social UI uses server-backed APIs for posts, stories, Reels, profiles, search, chat and notifications.

## Repository and environments
Production runs at [campusconnectbvm.online](https://campusconnectbvm.online). Feature development occurs on reviewed GitHub branches; `main` is production source. **Audit branch `12-adudit`** is isolated and has [draft PR #34](https://github.com/miteshpipaliya/CampusConnect/pull/34); it is not automatically production code.

## Development
Use Node.js 24 (GitHub CI version). Configure only the required environment variables locally in a gitignored `.env.local`; see `.env.example`, never commit secrets.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run audit
npm run build
npm run dev
```

Firebase migrations, index changes, Stream permissions and R2 configuration require operator approval and a staging environment. Unit tests and a successful build do not establish real account or media delivery correctness. Follow [Manual QA](docs/MANUAL_QA.md) for cross-account acceptance.

The `STREAM_CLIENT_TOKENS_ENABLED` flag is disabled by default until live client permission testing is approved; the existing REST fallback remains available. See `PROGRESS.md`, `ARCHITECTURE.md`, `SECURITY.md` and `KNOWN_RISKS.md` for current facts and limitations.

## Audit release policy
Audit work is intentionally separate from `main`. Only merge PR #34 after current-head CI, Ready Vercel preview, signed-in acceptance, Firebase index readiness, Stream/R2 tests and independent review.
