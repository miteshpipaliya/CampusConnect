# CampusConnect chat delivery stabilization

## Implementation
- Stream Chat WebSocket remains the primary path for live events when a securely authorized client token is available.
- Chat threads recover missed events through a **3-second foreground authenticated refresh** when the Stream client is disconnected/disabled, otherwise a 15-second recovery check. Inbox uses 6 seconds while disconnected and 20 seconds when connected.
- Requests are not issued when the page is hidden, offline, or its previous scheduled refresh remains in flight.
- Out-of-order responses are discarded, avoiding stale requests overwriting newer messages.
- Lightweight conversation refresh skips repeated Stream profile synchronization; initial opens and writes still synchronize.
- A successful send/reaction/unsend is acknowledged separately from the follow-up refresh, avoiding false "send failed" messages that encourage duplicate sends.
- The Stream client-token endpoint remains gated by `STREAM_CLIENT_TOKENS_ENABLED`. It was absent from the known Vercel production env keys at the time of the audit; **do not claim sub-second delivery or a live socket until Stream role/channel permissions have been audited and the flag is safely enabled**.

## Acceptance steps
1. Test student A and B in separate browsers on an isolated environment. Confirm both can send and receive without manual refresh; repeat with a disconnected WebSocket and active tab.
2. Confirm reconnect, refresh, message ordering, unread counts, typing, reactions, replies, unsend and read receipts.
3. Test blocked users, unauthorized direct channel queries, invisible activity and private attachment access with actual accounts.
4. Confirm exact deployed commit and inspect the Vercel deployment logs; CI builds and unit tests do not establish live Stream/R2 reliability.
5. Production deployment may still be blocked by the Vercel Hobby daily deployment quota. Do not bypass billing limits or change production secrets automatically.
