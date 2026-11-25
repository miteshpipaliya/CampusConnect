# Security acceptance matrix (sec-audit)

| Route family | Authentication | Origin on writes | Limits | Privacy / ownership | Verification |
|---|---|---|---|---|---|
| search | session | GET | 60/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| profile/[username] | session | GET | 120/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| handles/check | session | GET | 30/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| suggestions | session | GET | 30/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| connections | session | GET | 60/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| explore | session | GET | 60/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| explore/tags/[tag] | session | GET | 60/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| avatar | session | GET | 120/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| activity | session | GET | 120/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| archive | session | GET | 120/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| chat/presence | session | GET | 60/min local + escalation | Existing route-specific checks | Anonymous smoke where listed; live OWNER-VERIFY |
| auth | OTP/password | sameOrigin | durable IP/email | own profile allowlist | auth-hardening + security.spec |
| blocks/mutes/close-friends | guard | yes | 60/hour durable | owner UID | OWNER-VERIFY |
| account/delete/restore | cookie / guard | yes | 3/day or 5/hour | own UID | OWNER-VERIFY |
| health | public status; bearer for details | GET | 30s instance cache | no service details without secret | security.spec |

Owner test with two independent accounts: attempt cross-account access to drafts, private posts and R2 URLs, story viewers, saves, notifications, chats, highlights and management/delete endpoints. Repeat after blocking in each direction; confirm expired/revoked sessions fail on all instances. Confirm valid member access, normal writes and account recovery. Routes not listed require review. Local read buckets are not a global quota.
