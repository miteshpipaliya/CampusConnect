# CampusConnect
Instagram-inspired BVM student social application built with Next.js 15, Firebase Authentication and Firestore, private Cloudflare R2 media storage and Stream chat.
The repository includes both live API routes and some demonstration UI; not every interface is backed by persistent data.
## Local development
Configure the server environment variables shown in .env.example, then run npm install, npm run typecheck, npm test, npm run build and npm run dev.
## Phase 1
Foundation utilities, backend services and a guarded migration are developed in separate PRs with CI and Vercel preview verification. `npm run migrate` defaults to dry run; `npm run migrate -- --apply` performs writes and must be manually reviewed.
