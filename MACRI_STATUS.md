# MACRI Status

Last updated: 2026-10-15 (Dashboard live; reply status and stage compatibility live; Security Phase 1 verified)
GitHub main: 8246ce0 (2026-10-15, fast forwarded from security-phase-1). Local Mac repo: branch security-phase-1.
Stale branch on GitHub: claude/start-macri-dev-server-n7Cgv (April v1 only, safe to delete later).

Public repo rule: this file is safe to commit. Unresolved security findings, the rollout plan and dashboard steps live in .private/SECURITY.md (gitignored, local only). Never copy them here.

## Current Focus
Security Phase 1 is live (cutover 2026-10-14) and verified. Remaining: cleanup and the open items in Next Up. Session logging (/log) and Finance remain planning only.

## Security Phase 1 (public summary)
Decisions: single owner account with email and password; signed aftercare links for new links, with old links keeping basic care instructions; a separate Supabase test project with synthetic data only.
Built and live in Production since 2026-10-14:
- Owner login, an auth gate on all owner panels, Settings page with sign out. Public client pages (/consultation/client, /care) stay public.
- Server side owner checks on every /api route that costs money or sends messages; paid service keys move to server only env.
- Signed aftercare links with server side prompts and abuse limits; legacy links show the full written care guide plus a note to request an updated link.
- Database access rules (supabase/security/*.sql) giving only the owner account access, plus a rollback that keeps data restricted.
- Failed saves are no longer reported as database saves; device only data shows a persistent warning banner.
- Local tooling: npm run dev:api (local /api on port 3001), dev:test and dev:api:test (test project only, guarded), test (71 tests), check:access (test project).
Remaining: old key revocation, owner password reset screen, cleanup. Details: .private/SECURITY.md.

## Local Repository (checked 2026-10-14)
- Path: ~/Desktop/macri. Branch: security-phase-1 (same commit as main, 646b4a5), clean, pushed. No stashes.
- Local only documents (founder briefing, project briefing HTML and PDF, Founding Vision) are gitignored.
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
6. Password reset: set new password screen added 2026-10-14 (opens from a Supabase reset link; no "forgot password" button on the sign in page yet).

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
5. Live preparation DONE 2026-10-13 (owner account, rate limit table, Production server settings, cutover package, full data export with restore drill).
6. Shared session data approach and Finance one ledger spec, then /log, then voice logging.
7. DONE 2026-10-14: cutover approved and run. Retired intake webhook disabled; device copies of local data saved from both browsers; main fast forwarded and deployed to Production; owner only database access applied. Outside checks 23 of 23 pass; Saul confirmed clients, inventory, session prep and Daily Brief load with no device only warning.
8. DONE 2026-10-14: old provider keys revoked (checked: each returns 401). AI verified in Production (Inquiry Assistant draft, nothing sent).
9. DONE 2026-10-14: set new password screen deployed (reset link flow tested on the test project). Saul set a new owner password through a reset link in Safari (saved in Apple Passwords) and signed in with it in a fresh session.
10. See Open Items and Cleanup below.
11. DEADLINE: the Production Anthropic key expires 2026-11-12. Create a replacement and update the Vercel server setting before then, or AI stops working.
12. DONE 2026-10-14: voice. ElevenLabs retired eleven_monolingual_v1 and the plan no longer allows the cloned voice; switched to eleven_multilingual_v2 and the stock Rachel voice, with separate assistant and aftercare voice settings. Read aloud verified. Later: try eleven_v3 for a more natural English voice.
13. DONE 2026-10-14: saves the database had been refusing or dropping (pre existing, hidden by the old app): Finance expenses and goals, Content Studio drafts (06_missing_columns.sql applied to test and live), blank numbers now null, CRM instagram, notes and communications now saved, local dates in Finance and CRM. Live expense save, refresh and delete verified.
14. DONE 2026-10-14: Agent Queue no longer runs agents (paid AI) when opened; only Run Agents Now does. Deployed 7377747; Saul opened the page and Production logs showed no AI call.
15. DONE 2026-10-14: Part 1 of Context/spec-replies-sent-status-and-glance.md is LIVE (07 applied on live, deployed 4d8c32d). Verified: test project checks and Saul's browser check; on live, one Resend test email to Saul's own address was accepted and delivered to his Gmail inbox (not spam), its message id stored, CRM recorded it, the send button locked and no second send happened; the test client was deleted. Twilio sending is UNVERIFIED until separately tested. Part 2 ("Your studio at a glance") on hold for review.
18. DONE 2026-10-15: Dashboard ("Your studio at a glance") LIVE. 08_reply_stage_compat.sql applied on test and live; deployed 8246ce0 (served index-GXSPQQgJ.js). Read only check on live in Chrome: real data loads, no synthetic data, all six shortcuts and the tiles open the right screens, no AI or send calls. Business dates use America/Los_Angeles. "Collected today" hidden until payment dates exist. Homecheck test records removed from the test project. Known: CRM.jsx exports STAGES next to components (Fast Refresh warning, pre existing).
19. FUTURE (separate work, not started): the extremely simple Home (four workspaces, genuine conversation continuity, clear Dashboard button); Gmail submission retrieval (bringing form submissions in from Gmail). Twilio sending remains unverified.
20. Twilio SMS: Blocked, carrier registration incomplete; end to end testing pending (2026-10-15). Twilio emailed Saul that a support ticket is closing (reopens if he replies); that does not confirm texting works. Open before any SMS test: see Open Items (Twilio). No texts sent. Read only check 2026-10-15 (no texts, no changes): account active, paid (not trial), balance noted privately; one local (10DLC) number, SMS capable, matches the local setting; business profile and A2P profile approved in Trust Hub; NO A2P 10DLC brand registration, NO messaging service, NO 10DLC campaign. US carriers block unregistered 10DLC texts even when Twilio accepts them, so SMS should be treated as not working until brand and campaign are approved and the number is in a messaging service. Not checkable by API: the support ticket's content, and whether the Production (Vercel) Twilio settings match the local ones. Correction 2026-10-15: the approved Trust Hub "trust product" is SHAKEN/STIR (voice caller ID), not an A2P texting profile; the approved customer profile is an individual profile. Proposed registration (not submitted, awaiting Saul): Sole Proprietor A2P 10DLC if Saul has no EIN (Low Volume Standard if he does); fees per Twilio (Aug 2025): brand $4.50 one time, campaign vetting $15 one time and non refundable, campaign $2/month, plus per text charges; current balance is below the one time total. Prerequisites: an opt in point with consent language, a public privacy policy and SMS terms, a personal mobile for the brand verification code, and MACRI recording each client's SMS consent before any send. Decisions 2026-10-15: no EIN, so Sole Proprietor; initial campaign only inquiry replies, appointment details, aftercare (no review requests, no promotional follow ups); "MACRI" as business name is PROPOSED, not finalized; description must not imply a permitted private studio. Plan for review: Context/spec-sms-consent-and-controls.md (consent, server send checks, STOP handling). Nothing submitted, no funds added. Revision 2 (2026-10-15): client facing name Saul G Tattoos; MACRI may introduce itself as Saul's assistant; 3 texts per client per rolling 7 days enforced on the server; texting window 9 AM to 7 PM in the client's local time (time zone handling to confirm); START restores only the original consent scope; "Private Studio" wording to be replaced (separate approval). Revision 3 (2026-10-15): texting window uses only a confirmed client time zone (Pacific suggested, no area code inference, unknown means confirm before sending); limit always worded "3 texts in the last 7 days"; MACRI introduces itself only when the assistant speaks. SMS safeguards and Gmail integration ON HOLD. Disclosure wording "Up to 3 texts per rolling 7-day period" approved as a hyphen exception (2026-10-15); it exists only in the SMS spec, the consent features are not built or live.
21. DONE 2026-10-15: "Private Studio" wording replaced and deployed (live code checked: none left; consultation page shows "Saul Gutierrez | Tattoo Artist"). Rule (CLAUDE.md): no claim of an approved studio or registered business name unless Saul confirms it; accurate wording allowed if his status changes.
22. DONE 2026-10-15: consultation form draft safeguards deployed (548abcb, served index-BcxBRUh7.js). Health and comfort answers in memory only; drafts expire after 2 hours of inactivity on every device; no previous draft shown before a choice; shared devices resume only from the owner's Consultation page; Start new client; cleanup when the app detects sign out. Live public page checked without submitting: empty form, Start new client present, no draft created by visiting. UNVERIFIED: the actual window opened by "Resume in Client Mode" (mechanism tested; the real window not yet inspected).
17. DONE 2026-10-14: after a reload, Inquiry Assistant replaced the typed Recipient Email/Phone and Saul's edits with the original AI draft. Fixed (filled only when a new draft is generated), deployed 94e04b5. Verified on localhost (old code reverted both, new code kept both) and on live: one fictional draft generated (recipient email and phone filled from the inquiry), edits to recipient and reply survived a reload; nothing sent or saved (logs: one AI call, no sends; no test client).
16. DONE: Agent Queue Run Agents Now always visible with a loading state (f9747fc, 2026-10-14), deployed (on main and live; status corrected 2026-10-15).

## Proposed Product Direction (from Saul, 2026-10-14; FOR REVIEW, not approved to build or deploy)
- Home: a calm, simple overview of the bigger picture with a short "where we left off" recap. Long conversation histories stay in the background, reachable when needed.
- Familiar workspaces: Business Manager, Finance, Portfolio & Content, Clients & Replies. Each keeps its own conversations so Saul can return and continue.
- Conversation plus direct access: ask MACRI a question and it opens the relevant dashboard or filtered records. Clear buttons stay, so tools are reachable without chatting.
- Client replies first: keep what works (Saul gives details, MACRI writes in his tone, Gmail or Messages opens with recipient and body filled in, Saul reviews and sends). Later: explore inbox retrieval and draft preparation. Rule: opening a draft must not mark it as sent.
- Personality and voice: calm, warm, attentive, practical, quietly confident; inspired by his mother Macrina without impersonating her. Guides written conversation too. Voice stays optional.
- Later exploration, Stencil Studio: large preview with clear steps; presets by tattoo style (not named artists); adjustable line weight, detail, tonal and highlight guides; saved personal presets; before/after compare and opacity sliders; transparent PNG export and copy to Procreate keeping reference dimensions and alignment. Prove stencil quality and iPad alignment before expanding.
- Plan: after the remaining cleanup, review what exists and recommend the smallest first step. Review the Home screen and the client reply workflow with Saul before any implementation.
- Finding for the client reply review (2026-10-14): Inquiry Assistant's Open in Gmail and Open in Messages currently tick "response sent", move the client to Inquiry Response and log "Text message sent" (Messages) when the draft is only opened. Conflicts with the rule above. Not changed yet.

## Dashboard and future Home (Saul, 2026-10-15)
- The screen built as "Your studio at a glance" is the Dashboard (sidebar "Dashboard", at / and /dashboard for now).
- A separate, extremely simple Home comes afterward. It will contain the four workspaces (Business Manager, Finance, Portfolio & Content, Clients & Replies) and genuine conversation continuity ("where we left off"), with a clear Dashboard button. Not designed or built yet; when it exists, / moves to Home and the Dashboard stays at /dashboard.

## Open Items and Cleanup (recorded 2026-10-14, priority order)
1. DONE: Agent Queue paid calls on open (Next Up 14).
2. Anthropic Production key expires 2026-11-12: create a replacement and update the Vercel server setting before then.
3. ElevenLabs key "MACRI": switched off 2026-10-14, not deleted. Delete after a few quiet weeks.
4. Vercel Production: delete the unused VITE_ANTHROPIC_KEY and VITE_ELEVENLABS_KEY variables (the keys are already revoked; new code does not read them).
5. GitHub: delete the stale branch claude/start-macri-dev-server-n7Cgv. Decide whether security-phase-1 stays as the working branch or work returns to main.
6. Account security: turn on 2FA for the Google and GitHub accounts used to sign in to Vercel.
7. Email: set up a verified Resend sender (email sending not yet verified in Production).
8. CRM CSV import sends a "source" field that has no column, so it is dropped. Decide: add a column or stop importing it.
9. Color Lab camera ink scanner calls paid AI repeatedly while the camera is on. Consider a slower interval or a capture button.
10. Device only warning for an empty table stays until dismissed; consider clearing it when the database load succeeds with zero rows and nothing is saved on the device.
11. English voice sounds robotic with eleven_multilingual_v2; try eleven_v3 with Rachel later.
12. Lint: 67 pre existing problems (largest CRM.jsx, Finance.jsx, InquiryAssistant.jsx). No broad cleanup planned.
14. Twilio before any SMS test (no texts sent yet): (a) what the support ticket was about and whether its cause was resolved; (b) account status: trial or paid, and balance; (c) the sending number: type (local 10DLC or toll free), SMS capability, and that it matches the Production setting; (d) US carrier registration for that number: A2P 10DLC brand and campaign approved, or toll free verification approved; unregistered messages are blocked by carriers even when Twilio accepts them; (e) the Production Twilio settings in Vercel date from May 2026 and have never been tested; (f) MACRI records only Twilio's acceptance, not delivery: no delivery status updates and no handling of client replies or STOP; (g) the first test goes to Saul's own phone, with his approval.
13. .env.test.local no longer holds Production keys (removed 2026-10-14); local test AI routes answer "not configured".

## Open Questions for Saul
- Deposits: when does a deposit count as earned revenue (on receipt, at the session, or when forfeited)?
