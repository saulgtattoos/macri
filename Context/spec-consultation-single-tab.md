# Proposal: one consultation page, three modes (revision 3, 2026-10-16)

Status: DIRECTION APPROVED by Saul (2026-10-16); not built yet. Revision 3 records his decisions below. Revision 2 reflected how Saul actually runs consultations. Immediate priority stays the already pushed consultation security release (see "Order of work").

## The goal: separation, not windows (Saul, 2026-10-16)
What Saul valued in the original Client Mode was never the second window. It was that the client got a clean, dedicated consultation experience and never saw his private workspace (Dashboard, Finance, CRM, Inquiry Assistant, Project Wall, other clients, administrative tools). That separation is the requirement:
- Both client facing modes are designed as their own consultation experiences, not the owner dashboard with parts hidden: their own layout, no sidebar or app navigation, no owner components mounted, nothing from other areas loaded on screen.
- Presenting: Saul controls and types; the client sees only consultation questions and approved information; clean and readable on Zoom or a TV; pricing hidden by default with read only estimate and deposit amount on demand.
- Hand to client: a dedicated client experience on the iPad; no way into the private workspace; leaving requires genuine authentication; reload, Back or another address cannot bypass the lock.
Implementation consequence: the client facing screens are separate components (sharing only the question form with the owner wizard), rendered instead of the app shell, not overlays on top of it.

## Saul's decisions (2026-10-16)
1. **Pricing in Presenting:** the client may see the estimate and deposit amount, read only, and only when Saul chooses: a single **Show estimate / Hide estimate** control in Presenting, hidden by default. It never shows pricing controls, pricing type internals, deposit status, deposit tier or financial notes.
2. **Unlock:** Saul's MACRI password (Face ID or Apple Passwords fill is fine) with genuine authentication: the password is checked by Supabase every time; a button or a saved session alone never unlocks. A failed check stays locked. Reload, Back and typing another address never reveal owner information.
3. **Retiring the old Client Mode:** only after both new modes work, are thoroughly tested, and Saul confirms them in a real Zoom consultation and an in person iPad consultation. No loss of functionality during the transition.
4. Presenting: large readable text and a clean layout for Zoom or a TV; only client appropriate information; Saul types and moves between steps directly in Presenting (no switching back to Owner to type); ending a presentation never exposes owner information on a shared screen.
5. All three modes share the same questions, validation and consultation data; no extra screens, duplicated logic or complicated settings. Health answers keep their privacy rules.
6. Order of work agreed: security release, then shared form and Presenting, then Hand to client with unlock, then retire the two window version after verification.

## How consultations actually happen (Saul, 2026-10-16)
1. **Guided, most of the time.** Saul controls MACRI and types; the client watches. Over Zoom he shares his screen; in person he sometimes connects his computer to a TV or monitor.
2. **Hand to client, on the iPad.** Saul hands over the iPad; the client fills in their part alone; the iPad comes back to Saul.
Nobody operates a separate Client Mode window on a second screen. The two-window design was built for a workflow Saul does not use.

## What we learned on the iPad (test project, fictional data)
Client Mode opened, the resume handoff and Ready to Finalize worked. iPad Safari then reloaded the hidden client tab, so the "waiting" screen and the health answer were gone (failed safely: Saul's page warned him and invented nothing). The reloaded tab showed "only Saul can resume it"; Saul tapped Start fresh, which opened a blank form and most likely deleted the fictional draft (expected). The save test is still INCOMPLETE. Also found: the public client page cannot send answers anywhere except to the page that opened it, so on a client's own device it does nothing useful.

## The proposal in one sentence
Keep **one Consultation page and one form**, with three modes: **Owner** (today's wizard), **Presenting** (a clean view for screen sharing while Saul types) and **Handed to client** (locked, for the iPad). No second window, no messages between tabs.

## The three modes
| Mode | Who types | What is on screen | How it ends |
|---|---|---|---|
| Owner (default) | Saul | Full wizard: client questions, owner fields, Artist Vault, upcoming clients, menu | n/a |
| Presenting (Zoom, TV) | Saul | Client questions and answers only, larger text, no menu, no owner fields, no other clients | "End presentation" shows a neutral cover screen first ("Stop sharing, then continue") so private fields never flash on a shared screen |
| Handed to client (iPad) | Client | Client questions only, locked app wide | Client taps "I'm finished"; Saul unlocks with his MACRI password (Face ID fill on the iPad) and lands on his Summary |

All three use the same form state, so answers never travel anywhere: switching mode only changes what is shown and who may edit.

## 1. Guided consultation (Zoom or external display)
- **Why a presenting view instead of sharing the owner wizard:** the owner wizard shows artist notes, deposit tier, medical clearance, Artist Vault ratings and strategy, the "Upcoming" list with other clients' names and dates, the "client form waiting" banner, the menu, toasts and spoken confirmations. One mis-click while sharing would expose them. Presenting hides all of that by design instead of relying on care.
- **What the client sees:** the same questions in the same order (Client Info, Vision, Design Details, Health and Skin, The Experience ending with music, Pricing, Summary), Saul's answers appearing as he types, the studio pricing info and estimator. Pricing and deposit decisions Saul makes with the client (estimate, deposit amount) can show as read only values, because they are the client's own quote; internal assessments never show.
- **Typing while presenting:** Presenting is a working view, not a picture: Saul types the client's answers and moves between steps right there, with the same fields and validation as the owner wizard. Owner only fields are simply not in it; Saul fills those after ending the presentation.
- **Show estimate / Hide estimate:** one control in the Presenting header, off by default. When on, it shows the estimate (hours range and total) and the deposit amount read only, in plain words. It never shows the pricing controls, deposit status, deposit tier or notes. It resets to hidden whenever a presentation starts.
- **Health questions:** visible to that client only, on their own consultation. Practical rule for Zoom: do not record the call while on the health step (or at all), since a recording would keep those answers outside MACRI.
- **Screen sharing tips (no code):** in Zoom share only the browser window, not the whole screen; turn on Do Not Disturb so notifications from other apps do not appear; on a TV, use the presenting view full screen.
- **Option considered, not recommended now:** a separate presentation window on the TV while the laptop keeps the owner wizard (Saul sees private notes while the client sees the clean view). It needs a live one way link between two windows, the kind of moving part we are removing. Worth revisiting only if Saul finds he needs his notes visible while presenting; it would be display only (no inputs, nothing stored) and reuse the same form component.

## 2. Hand to client (iPad)
- Saul taps **Hand to client**; the app locks into the client form. The lock lives in the sign in gate, so every address (typing /crm, Back) shows the client form, never owner pages or data.
- The client taps **I'm finished** and sees "Please hand the iPad back to Saul".
- **Unlock (genuine authentication):** "Unlock" opens a password field for Saul's MACRI account (email fixed to the signed in owner). The password is sent to Supabase and checked every time; unlock happens only if Supabase accepts it for the same account that is signed in. Apple Passwords may fill it after Face ID, which is still a real check, because the password itself is verified by Supabase. No button, timer, saved session or stored flag unlocks by itself. A wrong password, a network error or any other failure keeps the lock and shows a calm message; Supabase's own limits slow repeated guesses. Optional extra: iPad Guided Access keeps the client inside Safari.
- **Lock coverage:** the lock is checked in the sign in gate before any owner page renders, so reload, Back, typing /crm or any other address all show the locked client form. Tests cover each of these.
- **Reload, close, suspend:** the form is the tab on screen, so Safari does not pause it in use. After a reload or reopening, a "locked" marker (no client data) reopens MACRI still locked, never in Owner mode. Non health answers come back from the draft; health answers ask again with the existing notice. Sign out or session expiry wipes the draft and the marker as today. The 2 hour inactivity expiry still applies.

## 3. Owner only information
Shared rule for both workflows: the client facing modes never render or write owner only fields (artist notes, deposit tier, medical clearance, pricing and deposit decisions, Artist Vault). The existing lists in `src/constants/consultationFields.js` drive what each mode shows, and tests check it. Presenting also hides other clients and business controls; Handed to client adds the app wide lock and password unlock.

## 4. Health answers and privacy
Unchanged rules: memory only, never in browser storage or logs. With one form state there is nothing to send between tabs, so the answers are lost only if that one page reloads, and the existing notice asks Saul to check again before saving.

## 5. Fewest screens, least duplicated code
- **One form component** holding the questions, order, validation, wording (music intro, privacy notes) and draft behavior, used by all three modes. Today the questions exist twice (`Consultation.jsx` and `ConsultationClient.jsx`, about 3,300 lines together); they would exist once.
- **One draft** (the owner draft, health answers excluded) instead of two (owner and client drafts).
- **One route** (`/consultation`) instead of two; the public `/consultation/client` page and the two-window machinery retire after a transition.
- Mechanisms that disappear: popup and blocked message, resume handoff, window message checks, owner reload resend, saved notice, Intake Complete hand back, shared device restricted screen. New: the presenting view (mostly hiding things) and the iPad lock with password unlock.
- Tests: keep the owner only lists, the merge rules where still used, draft expiry and memory only tests; retire the window messaging tests; add tests that each mode shows only what it should, that the lock covers every route and survives reload, that a wrong password stays locked, and that health answers are never stored.

## 6. Does it simplify?
Yes, for both the experience and reliability. One page to learn, one place for answers, and no step that depends on a hidden tab. The main new risk is the iPad lock (the owner session is in the same tab), which is why it uses the existing password and gets dedicated tests.

## Known limitation of the current two window version (accepted by Saul, 2026-10-16)
On iPad Safari a background client tab may be reloaded, losing health answers that are deliberately never stored. Accepted temporarily on these conditions: missing health answers are clearly identified; MACRI never treats missing answers as complete; Saul is prompted to reconfirm them before saving; nothing sensitive is exposed or restored from an unauthorized window. The single tab design removes the cause.

## Order of work (recommended)
1. **Now:** finish the consultation security release already on the Preview (it fixes real problems on the live site). The remaining iPad save test can be skipped or run on desktop, since the single tab design replaces that path; release is Saul's decision.
2. Build the shared form component and the Presenting mode first (it serves the most common workflow and is the lowest risk), on the test project.
3. Then the Hand to client lock and unlock; iPad Preview check.
4. Retire the two-window Client Mode and the public client page after both modes are in use.
Each step: spec confirmed, test project first, Preview check, release only with approval.

## Questions for Saul
Answered 2026-10-16 (see Saul's decisions above). Open detail to confirm when the Presenting spec is written: the exact wording on the Show estimate panel and the end presentation cover screen.
