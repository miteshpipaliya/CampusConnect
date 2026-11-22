# Phase 2 + Phase 3 upgrade (in progress)
This branch intentionally combines identity and social graph development as requested by the owner. Do not merge before CI, Vercel and privacy verification.
## Completed foundation
- Centralize allowlisted student emails; remove embedded personal tester email.
- Pure privacy truth-table and follow action decision logic with tests.
## Pending implementation
- Profile editing and username claim transactions; avatar crop/removal/hydration; settings UI and APIs.
- Follow requests, follower lists, blocks, mutes, close friends, suggestions, privacy enforcement on all reads and signed media, and Following feed.
- Composite index review and manual two-account tests.
## Safety
No production migration or account deletion was performed. Private content must not be exposed before server-side privacy checks are fully wired.
