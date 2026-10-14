# MACRI Status

Last updated: 2026-10-13 (paused before cutover; live database locked; Production unchanged)
GitHub main: 7196e73 (2026-06-06). Local Mac repo: in sync with GitHub, large uncommitted work (see Local Repository).
Stale branch on GitHub: claude/start-macri-dev-server-n7Cgv (April v1 only, safe to delete later).

Public repo rule: this file is safe to commit. Unresolved security findings, the rollout plan and dashboard steps live in .private/SECURITY.md (gitignored, local only). Never copy them here.

## Current Focus
Security Phase 1 rollout preparation. The live Supabase project is paused (restorable until 2027-07-24); it will be resumed and immediately locked (supabase/security/05_resume_lockdown.sql) before inspection. Session logging (/log) and Finance remain planning only.

## Security Phase 1 (public summary)
Decisions: single owner account with email and password; signed aftercare links for new links, with old links keeping basic care instructions; a separate Supabase test project with synthetic data only.
Built locally (uncommitted):
- Owner login, an auth gate on all owner panels, Settings page with sign out. Public client pages (/consultation/client, /care) stay public.
- Server side owner checks on every /api route that costs money or sends messages; paid service keys move to server only env.
- Signed aftercare links with server side prompts and abuse limits; legacy links show the full written care guide plus a note to request an updated link.
- Database access rules (supabase/security/*.sql) giving only the owner account access, plus a rollback that keeps data restricted.
- Failed saves are no longer reported as database saves; device only data shows a persistent warning banner.
- Local tooling: npm run dev:api (local /api on port 3001), dev:test and dev:api:test (test project only, guarded), test (71 tests), check:access (test project).
Remaining before rollout: Saul's read only checks, test project setup and pass, then a coordinated cutover. Details: .private/SECURITY.md.

## Local Repository (checked 2026-10-11)
- Path: ~/Desktop/macri. Branch: main, tracking origin/main, at 7196e73. 0 ahead, 0 behind after fetch. No stashes.
- Uncommitted: HomeBase redesign (src/pages/Home.jsx), Security Phase 1 changes (api/, src/, supabase/, scripts/, tests/, config), docs moved into Context/, merged CLAUDE.md, Context/macri-notes-and-ideas.md additions.
- Untracked docs: Context/CLAUDE.md, Context/MACRI_CONTEXT.md, Context/README.md, Context/macri-roadmap.md, Founding Vision/, MACRI html file.pdf, MACRI_Founder_Briefing.md, macri_project_briefing.html.
- Gitignored local only files: .env, .env.local, .env.test.local (when created), .private/, MACRI_v1_standalone_demo_archive.txt (must never be committed).
- Before any commit: review the untracked docs for anything that should stay private.

## Home.jsx Review (2026-10-11, diff of working copy against HEAD)
Origin: planned May 2026 UI overhaul ("HomeBase is the reference panel", Context/macri-notes-and-ideas.md). Built on the last Home commit 7f18a34 and keeps its Daily Brief. 2,124 lines at HEAD, about 1,020 now.
Layout: single column replaced by two zones on desktop (main column, 380px right column); stacks on mobile.
Kept, same logic: greeting, welcome modal (restyled), daily quote with refresh and read aloud, Daily Brief tiles (Today at a Glance, shown first), earnings (Week, Month, YTD; Revenue, Tips, Avg per Session, Tax Aside 28%), session calendar with day detail, studio pipeline stage counts with bottleneck warning, goals, toast component.
Changed: pipeline Active clients hero number; Full Board goes to /projects (was /crm); shorter period labels; refreshed styling. Security Phase 1 changed only its read aloud call (now through the server).
Removed, with no equivalent elsewhere: the Log a Session form (it wrote to both client.sessions and sessions_v4), voice session logging, new client with first session, Home CSV import, Generate Aftercare Link after logging.
Regressions: Log a Session button goes to /session-prep (does not log sessions; /log does not exist yet); showToast never called. No screen currently logs a session into both money stores.

## Session Logging Plan (decided 2026-10-11, not started)
- Manual session logging returns on a dedicated /log page; Home's Log a Session button will navigate to /log.
- Voice logging returns later, after Security Phase 1, through the same save workflow (no separate write path).
- One save must update client history and Finance consistently with no duplicate entries.
- BLOCKER before /log: decide the shared session data approach (one ledger vs today's client.sessions and sessions_v4). Part of the Finance one ledger design.

## Checks Run (2026-10-11)
- npm run build: passes (chunk size warning only).
- npm test: 96 of 96 pass (server routes with all network stubbed, database access rules running the real SQL in an in memory Postgres, device cache protection).
- npm run lint: 69 problems (was 78 before Security Phase 1). All new files lint clean; no new errors in touched pages. Remaining problems predate this work and stay documented (largest: CRM.jsx 17, Finance.jsx 13, InquiryAssistant.jsx 9). Home.jsx has 3, same count as HEAD.
- Production bundle scan: only the public Supabase URL and publishable key remain.
- Local dev: npm run dev and npm run dev:api serve the app and /api together; every changed page compiles.
- check:access against the real test project: all checks pass (2026-10-12).
- Browser checks in the test project: all pass (2026-10-13).
- Not yet done: any paid API test (needs approval); live rollout.

## Verified (how)
- Session money is stored twice: client.sessions (Home, CRM) and sessions_v4 (Finance). CRM edits and deletes do not reach Finance; Finance CSV imports do not reach Home or CRM. The CRM Log Session modal writes only client.sessions.
- Supplies purchases do not create expenses. Finance applies 28% tax reserve to gross, excludes tips from net profit, and defaults expenses to deductible.
- Local Mac repo is in sync with GitHub main. (git fetch and rev-list on 2026-10-11.)
- Email still sends from Resend's test sender (code review).

## Not Yet Verified
- Visual check of the redesigned Home and the new login in a browser (desktop and mobile widths).

## Known Issues and Risks (non security; security items are in .private/SECURITY.md)
1. Money data split across two stores. Totals disagree between Home and Finance.
2. Device fallback can show different numbers on different devices (now labeled by the banner, not removed).
3. Large uncommitted work exists only on this Mac until committed.
4. Session logging and voice logging removed from Home; Log a Session button points to the wrong page.
5. Lint fails across the codebase (69 problems, pre existing). Kept documented, no broad cleanup now.
6. No in app password reset screen yet.

## Decisions Log
- 2026-10-11: Security lockdown comes before the Finance expansion.
- 2026-10-11: Finance will be built on one ledger (ENTER IT ONCE. USE IT EVERYWHERE.). Bookings separate from revenue, profit separate from cash, no default immediate deduction.
- 2026-10-11: Saul is the only user. Login is a single owner account (email and password); database policies allow only that account.
- 2026-10-11: Deposit recognition left UNRESOLVED pending Saul's decision.
- 2026-10-11: Standing instructions live in root CLAUDE.md. Older docs kept in Context/. README.md and MACRI_CONTEXT.md stay in Context/ for now.
- 2026-10-11: Keep the HomeBase redesign.
- 2026-10-11: Manual session logging returns on /log; voice logging later through the same save workflow; shared session data approach first.
- 2026-10-11: Existing lint failures stay documented; no broad cleanup now.
- 2026-10-11: New aftercare links are signed; links already sent keep the written care guide and show a note; public paid requests are rate limited and fail closed.
- 2026-10-11: Security testing uses a separate Supabase test project with synthetic data only.
- 2026-10-11: Rollback for database access keeps access restricted; disabling row level security is never a rollback step.
- 2026-10-11: Unresolved security details stay in .private/SECURITY.md (gitignored). MACRI_STATUS.md was never committed; it stays committable and public safe.

## Next Up
1. DONE 2026-10-12: live project resumed and locked (verified), signups off, read only inspection complete. n8n check done (automation workspace no longer active; Concierge stays off until automation is rebuilt). Test project created and set up with synthetic data; automated access checks and all eight browser checks pass (sign in, sign out, expired session, failed save labeling, other account, pre login device data, public client pages, phone width). Next: approvals for commit and the staged rollout (.private/SECURITY.md).
2. DONE 2026-10-13: test project, synthetic data, access checks and browser checks.
3. DONE 2026-10-13: docs reviewed; local only documents gitignored (founder briefing, project briefing HTML and PDF, Founding Vision). Three local commits on branch security-phase-1 (docs, HomeBase redesign, Security Phase 1). Not pushed.
4. DONE 2026-10-13: branch pushed; Vercel Preview for security-phase-1 uses only the test project with AI and messaging disabled; preview deployment verified. Production and the live database unchanged.
5. Live preparation DONE 2026-10-13 (owner account, rate limit table, Production server settings, cutover package, full data export with restore drill). Cutover plan shown to Saul and awaiting approval; resume at step C0 (.private/SECURITY.md, FINAL CUTOVER PLAN). Live database remains locked; Production unchanged.
6. Shared session data approach and Finance one ledger spec, then /log, then voice logging.

## Open Questions for Saul
- Deposits: when does a deposit count as earned revenue (on receipt, at the session, or when forfeited)?
