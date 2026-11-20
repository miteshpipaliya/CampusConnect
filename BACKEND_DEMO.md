# CampusConnect demo API (no database)
The `GET /api/demo/profiles` endpoint returns ten fictional, public sample accounts.
- `?handle=aarav.codes` — sample profile and counts
- `?handle=aarav.codes&relation=followers` — follower list
- `?handle=aarav.codes&relation=following` — following list
- `?q=aarav` — search
- `?branch=Computer%20Engineering&division=4` — sample classmate matches

All requests are bounded and read-only; responses use `Cache-Control: no-store`.
`POST` returns 501 intentionally: without a database, authenticated durable writes and real user-to-user actions cannot be provided securely. Browser-local likes/follows/posts/messages remain demo interactions. Do not use fictional identities as real students or claim the API provides real authentication.
