# CampusConnect consolidated feature-branch integration (2026-11-22)

This integration is based on production branch `main` at `709a6dfa419c244541ee61fd1f6094f2dfeb334c` and retains the earlier PR #22 release upgrade.

## Branch ancestry included and conflict-resolution policy

- `phase-4` (`4913e4d9`): its composer, post management, media carousel, story polls and profile improvements are already in main via PR #18 / subsequent updates. Preserve the **newer main** versions rather than revert Stream/R2/privacy fixes.
- `phase-2-3-upgrade` (`878a420b`): newer main already contains social graph and privacy enforcement. Add the missing pure identity helper and tests, while retaining newer privacy rules.
- `fix/registration-json-response` (`e943efda`): keep the current OTP-based authentication UI and add clearer handling for non-JSON/API errors, rather than restoring obsolete sign-up flow.
- `feature/bvm-verification-security-milestone` (`5fda6d84`): newer main already contains OTP verification, explicit consent and relationship privacy fields. Add missing institutional-email regression tests and a robust asynchronous health check. **Do not** reintroduce the older login code that would lock out legacy users or enforce unverified institutional branch-code assumptions.
- Other Phase 1–4, audit, content-pipeline, Stream, `codewithclaude` and prelaunch branches were already ancestors of `main` or included through PR #22.
- Dependabot version-upgrade branches intentionally excluded; review dependency major-version compatibility separately.

An octopus history merge lists the four divergent feature branches as additional parents, while the resolved tree retains the current main implementation and integrates the remaining safe fixes. This is a **resolved integration**, not a blind checkout or overwrite of outdated branch files.

## Production deployment verification required

- GitHub quality and secret-scan must be green for this exact integration commit and the final merged main commit.
- Vercel `campusconnect-github` must build a production deployment from the final main SHA and report READY. A READY deployment from old commit `732fa105` does not represent these changes.
- Hobby deployment creation quota `api-deployments-free-per-day` may block publication; do not claim it is live until the deployment SHA and domain are confirmed.
- Live two-account Firebase/Stream/R2 acceptance and privacy permission testing remain separate requirements, including `STREAM_CLIENT_TOKENS_ENABLED` being off until the Stream role/channel policy is approved.
