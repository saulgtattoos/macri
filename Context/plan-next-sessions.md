# Plan: next development sessions (handoff from Saul, 2026-10-15)

Status: HANDOFF ONLY. Nothing in this document is authorized for implementation yet. We review findings together first. Saved at the end of the 2026-10-15 session; resume "later today" (2026-10-16).
Standing approval and its limits for small improvements: see "Working with Saul" at the end.

## Development sequence (agreed)
1. Finalize consultation safeguards and review the remaining concerns (section 6).
2. Gmail integration for incoming inquiries and communication intelligence (section 2).
3. Granola + n8n integration for automatic consultation note imports (section 2).
4. Comprehensive product and workflow review, including the top five recommendations (sections 1, 3, 4), before deciding on additional major features.

If the review reveals an urgent security or reliability issue, bring it to Saul before continuing with feature development.
Deadline to keep in view: replace the Production Anthropic key before **2026-11-12** (MACRI_STATUS.md, Open Items 2), along with the other outstanding decisions there.

---

## 1. Independent product and workflow review

Approach as a senior software architect, product designer, UX specialist, and someone who understands the daily workflow of a tattoo artist. Do not limit the review to features currently under discussion: evaluate MACRI as a complete product. Review the actual code, tests, workflows and project documentation.

### Workflow improvements
Look for opportunities to simplify how artists use MACRI. Especially: accomplish more with fewer steps.
- Are there unnecessary steps, repetitive actions, or confusing transitions?
- Are we asking artists or clients to enter the same information more than once?
- Could existing features work together more naturally?
- Are there opportunities to automate repetitive tasks safely?
- Could MACRI anticipate the next logical action instead of requiring the artist to navigate manually?

### User experience and design
Evaluate how MACRI actually feels to use. Consider the artist's experience and the client's experience separately.
- What could feel smoother, faster, or more intuitive?
- Where does the experience feel like complicated software rather than a natural conversation?
- Could screens be simplified without sacrificing useful functionality?
- Are there confusing labels, unnecessary buttons, or excessive choices?
- How could the mobile and iPad experience improve?
- Are there small design refinements that would make a surprisingly big difference?

### Connections between existing features
Consider CRM, Consultations, Project Wall, Inquiry Assistant, Agent Queue, Finance, Session Prep, Aftercare, and the other existing tools.
- Are these features sharing information effectively?
- Are we duplicating information or responsibilities?
- Are there unnecessary transitions between screens?
- Could related workflows be consolidated?
- Could there be a more seamless client journey from initial inquiry through consultation, design, scheduling, tattoo session, and aftercare?
Saul: "I don't want artists navigating five different screens to accomplish something that could happen naturally in one workflow."

### Reliability, security, and technical architecture
Evaluate the underlying implementation as well as the interface. Address important weaknesses before building more complexity on top of them.
- Are there fragile workflows or potential failure points?
- Is there duplicated logic that could be consolidated?
- Are there architectural decisions that may become difficult to maintain?
- Are there privacy, security, permission, or data integrity concerns?
- Where could failures happen silently?
- What should be strengthened before adding Gmail, Granola, and additional n8n automations?
- Could automated tests, error handling, or integration monitoring improve?

### Removing unnecessary complexity (a top interest)
Actively look for features, screens, buttons, or workflows that could be simplified, combined, or eliminated. Do not assume everything already built must remain as it is.
- If two features perform similar responsibilities, say so.
- If a workflow could go from five actions to two, show how.
- If something no longer serves a meaningful purpose, explain why to reconsider it.
Saul gives permission to challenge existing product decisions and recommend removing things, not just adding them.

---

## 2. Preparing for Gmail and Granola
Future priorities only. Not authorization to connect services or implement anything.

### Gmail: intelligent inquiry management
Goal: MACRI recognizes incoming tattoo inquiries, consultation submissions, returning clients, and communications that need Saul's attention. Eventually MACRI should:
- Recognize new inquiries automatically.
- Identify existing clients and associate emails with their CRM records.
- Extract relevant tattoo project information.
- Recognize unanswered messages or conversations requiring follow up.
- Prepare suggested responses in Saul's communication style.
- Reduce manual copying, pasting, and organizing.
Constraints: start with read only access; require approval before any communication is sent or inbox information is changed.
Evaluate whether this belongs in Inquiry Assistant, Agent Queue, CRM, or a more unified workflow, instead of creating another disconnected feature.
Related existing notes: Gmail submission retrieval in MACRI_STATUS.md (Next Up 19); Gmail integration was paused 2026-10-15.

### Granola + n8n: consultation intelligence
Granola runs alongside Zoom consultations. After the meeting, Granola's notes flow into MACRI through n8n, and MACRI organizes them into:
- Tattoo vision and design requirements.
- Placement, size, style, and project scope.
- Client preferences and session experience.
- Decisions made during the consultation.
- Questions that still need answers.
- Follow up actions and next steps.
Notes appear in the appropriate client record for Saul's review and approval.
Investigate the simplest and most reliable architecture: API and webhook capabilities, subscription requirements, secure client matching, duplicate prevention, and consent.
Requirements: sensitive information handled appropriately; AI generated interpretations are never treated automatically as confirmed client facts; Granola stays optional so MACRI is not permanently dependent on one provider.

---

## 3. Creative recommendations (Claude's independent judgment)
Based on real experience developing and testing MACRI:
- What useful capabilities haven't we considered?
- What is frustrating about the current architecture or workflow?
- What opportunities may Saul have overlooked?
- What could make MACRI genuinely different from typical tattoo business software?
- What small, low effort changes might create an unexpectedly large improvement?
- If responsible for MACRI's long term product success, what would you prioritize?
Do not simply agree with Saul's ideas; if there is a more effective approach, explain it. Think like a product designer and developer. This does not authorize implementation.

---

## 4. Top five recommendations (deliverable of the review)
Rank the five most valuable improvements by impact on the artist's actual daily experience, not technical interest. For each:
1. What you noticed: the problem, limitation, or opportunity, with references to relevant code or workflows.
2. Your recommendation: what you would change.
3. Why it matters: how it improves the artist's or client's experience.
4. Implementation effort: quick improvement, moderate project, or major undertaking.
5. Priority: how urgently to address it.
6. Trade offs: risks, compromises, or existing behavior that could be affected.
Distinguish functionality that is implemented, partially implemented, or still conceptual. Base findings on actual code, tests and documentation; do not assume a feature works because a screen or component exists. Do not recommend features simply to add features: MACRI should become simpler, smarter, and more connected.

---

## 5. Guiding philosophy
MACRI is a relationship centered operating system for tattoo artists, not complicated business software with endless features and settings. Technology manages complexity behind the scenes so the artist can focus on art, connecting with clients, and a sustainable business. The experience should feel calm, thoughtful, intelligent, professional, and personal. MACRI should understand the entire client journey rather than provide separate tools to manage, and know when to help without becoming intrusive.

**ENTER IT ONCE. USE IT EVERYWHERE.**
**Build less complexity. Create more capability.**

---

## 6. Current status at handoff (consultation work, 2026-10-15)
All of this is LOCAL and UNCOMMITTED on branch security-phase-1. Nothing deployed. Security specifics live in .private/SECURITY.md.

Approved by Saul and implemented locally (tested in Chrome on the TEST project with fictional data):
- Direct window to window resume: only the Client Mode window the owner page opens can resume a draft; one time, 60 seconds; sending window and origin checked. Popup blocked: nothing authorized, clear message on the owner page. Stricter behavior after an owner page reload kept (Saul approved).
- Sender window checks on the other Client Mode messages (answers, reset, saved), plus an allowlist so Client Mode answers can never fill Artist Vault fields (independent improvement, reported).
- Step order in both client form and owner wizard: Client Info, Vision, Design Details, Health and Skin, The Experience (ends with the music question and Saul's intro line), Pricing and Deposit, Client Summary (owner also Artist Vault).
- Client Summary "Session Experience" card (music, playlists, studio TV, tattoo experience, sitting endurance; owner summary also comfort notes).
- Files: src/pages/Consultation.jsx, src/pages/ConsultationClient.jsx, src/lib/clientResume.js (new), tests/web/client-resume.test.mjs (new).
- Checks at handoff: build passes; 164 tests pass; lint 63 problems (unchanged baseline).

Progress 2026-10-16 (local, uncommitted): owner only fields and gap only merge built (src/constants/consultationFields.js, mergeClientAnswers in src/lib/clientResume.js, tests/web/consultation-merge.test.mjs); saved notice now targets the Client Mode window whose answers arrived (also after an owner page reload). 170 tests pass, build passes, lint 63 (baseline). Browser verified on the test project with fictional data, except the real save path (needs a test project save). The "Test Rosa Example" draft expired on its own (2 hour rule); new fictional drafts "Test Nova Sample" / "Test Owner Entry" are in use at 127.0.0.1:5173.
Progress 2026-10-16, part 2 (local, uncommitted): client form Pricing and Deposit step is view only (studio pricing info and estimator kept; Apply to Estimate and the editable pricing type, totals, deposit amount, deposit status, dates and deposit requirement removed; a note says Saul confirms these); owner wizard unchanged. Owner page reload no longer loses the waiting client window or its memory only answers (no data "owner page ready" broadcast; the waiting window opened by that page resends; gap only merge; same client name only). Fixed a bug in live 548abcb: the client "Intake Complete" screen was wiped by the draft removal that Save performs. Owner "client form waiting" banner refreshes right after Save. Approved end to end Save on the TEST project passed (fictional "Test Nova Sample", saved while the owner page had been reloaded); that one fictional record REMAINS in the test project CRM (not deleted, awaiting Saul). 174 tests pass, build passes, lint 63.
Progress 2026-10-16, part 3 (local, uncommitted): Medical Clearance removed from the client form (stays blank until Saul sets it in the owner wizard; owner only, never accepted from Client Mode). Health recovery hardened: resend target rule extracted (answersResendTarget) and tested; owner Health step shows a notice when a reloaded consultation has no health answers. Browser verified on the test project with fictional data and no database writes: answers only between the verified windows, never in browser storage; a tab opened by hand received nothing; different client and self posted injections ignored; closed client window leaves health fields empty with the notice. 180 tests pass, build passes, lint 63. Waiting banner refresh after Save not browser verified (needs a save). Fictional "Test Nova Sample" remains in the TEST project CRM (Saul: keep for now).
Decided by Saul (2026-10-15), to do first next session:
- Protect owner only fields (APPROVED): Client Mode answers ("Ready to Finalize") must never replace artist notes, deposit tier selections, Artist Vault fields, or other owner only information, especially with blank values. Review the incoming field allowlist (CLIENT_ANSWER_KEYS in Consultation.jsx) for any other private field. Add regression tests confirming existing artist notes, deposit selections and Artist Vault information stay unchanged when the client presses Ready to Finalize.
- Saved confirmation after an owner page reload (APPROVED to investigate): keep the "consultation saved" confirmation working when the owner page was reloaded while Client Mode stays open (today the owner page loses its handle on that window, so the notice never arrives). Find the simplest safe solution; if it needs significant architectural change or raises privacy concerns, explain the recommendation to Saul before implementing.
- Final verification after both: run the relevant tests, verify the build, review outstanding concerns, then prepare to finalize the consultation phase (commit, push, deploy only with approval). Safari and iPad stay on the follow up list.
- Not browser tested: the 60 second expiry (unit tested only), the real reset and saved paths (unit tested; testing them would clear the test draft or save a consultation).
- Follow up: Safari and iPad testing.
- Then: commit, push and deploy only with Saul's approval; update MACRI_STATUS.md (item 22 and the resume window result) and clean up the test setup.

Test setup left in place (do not disturb without Saul):
- Test servers: started as needed (both were stopped by the system 2026-10-15; 5173 restarted 2026-10-16).
- Test draft "Test Rosa Example" (127.0.0.1:5173) and "Test Milo Sample" (127.0.0.1:5174), fictional; both expire after 2 hours of inactivity.
- The unknown draft at localhost:5173 stays untouched until Saul identifies it.

---

## 7. Owner sign in (RESOLVED 2026-10-15)
Sign in on iPhone and iPad failed with "Email or password is incorrect." Supabase confirmed invalid_credentials: the devices held an outdated saved password (saved passwords were not syncing between devices). Password reset once from a single opening of the reset link; sign in now works on Mac, iPhone and iPad. Configuration (live project, keys, auth settings) was verified correct. Lessons: a reset link works once, and opening it a second time shows otp_expired, and with a session already stored the app showed the Dashboard instead of the set new password screen, hiding the error. Full private notes: .private/signin-incident-2026-10-15.md.
Approved for the plan, NOT to implement yet (review first; touches authentication, so propose details before building):
- Secure "Forgot password?" on the sign in page (Supabase reset email to the owner address, generic confirmation that never reveals whether an account exists, rate limited by Supabase; uses the existing set new password screen).
- Accurate login errors by Supabase error_code: invalid_credentials, email_not_confirmed, rate limits (429), network failure, other (generic with a hint), without revealing whether an email has an account.
- Reset link opened twice: show the link error (expired or already used) even when a session already exists, instead of silently showing the Dashboard.

## Working with Saul (standing approval, 2026-10-15)
Development principles: MEASURE TWICE. CUT ONCE. ENTER IT ONCE. USE IT EVERYWHERE. BUILD LESS COMPLEXITY. CREATE MORE CAPABILITY. Details in CLAUDE.md, Guiding Principles; apply them to every item in this plan (Gmail, Granola, the product review).
Act as senior engineer, product designer and UX specialist. Without asking: refine layouts, spacing, navigation and hierarchy; improve wording and conversational flow; make experiences more welcoming, accessible and personal; fix small usability problems found while developing; add helpful explanations, errors and quality of life touches; improve code quality without expanding scope; add tests and safeguards; small enhancements that complement the feature in progress. Think about the whole experience (client comfort, natural flow, trust, usefulness to the artist).
Still ask before: commit, push, deploy; database migrations or production data; auth, security architecture or privacy protections beyond approved work; messages or external actions; paid services, significant dependencies, recurring costs; pricing, deposits, policies or other business decisions; major features or substantially changed workflows; deleting data or irreversible actions. Anything that could affect client information, security or established behavior: explain the proposal first. Unsure: ask.
Report independent improvements as: what was noticed, what changed, why it benefits MACRI, how it was verified. Keep unrelated changes separate. Prioritize simplicity, elegance, reliability and usefulness.
