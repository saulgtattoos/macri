MACRI Roadmap | Last updated May 2026

---

PHASE 1 | Finish the product for yourself
Target: 2 to 4 weeks
Status: In progress

Task 01 | UI Overhaul
Status: Active | Priority unlock for everything else
Time: 2 to 3 sessions
Subtasks:
  Define new design language spec before touching code
  Rebuild HomeBase as the reference panel first
  Quote block becomes a hero moment with elegant typography and space
  Apply glass depth and soft layering to surface tokens
  Roll new language to CRM, Pipeline, Inquiry Assistant
  Remove anything that feels AI generated or template-like
Pit stop: While in HomeBase, decide on the scrollable section order. What does Saul want to see first every morning?

Task 02 | Log Session Route
Status: Spec in progress | Blocked on two open questions
Time: 30 minutes to 1 session depending on data architecture decision
Subtasks:
Fix Log Session CTA in HomeBase | change navigate target from /session-prep to /log
Add /log route in App.jsx
Build LogSession.jsx at src/pages/LogSession.jsx
Add Log Session to Sidebar.jsx NAV_ITEMS
Add Log Session to BottomNav.jsx MORE_ITEMS
Open Questions (must answer before writing code):
Q1 | What fields should a logged session capture? Current shape is date, amountPaid, tip, tattooDescription. Expand to include hours, style, notes, reference images?
Q2 | Where does the saved session write? Sessions currently nest inside client records. Options are keep nested and pick client from dropdown on log form, or move sessions to their own Supabase table referencing client by ID.
Note: Q2 affects scope significantly. Nested write is 30 minutes. New table is a data architecture session.
Dependency: Answer both open questions before touching code.

Task 03 | Voice Agent Call Log holding state
Status: Pending | Cosmetic only
Time: 30 minutes
Subtasks:
  Replace empty or broken state with polished Coming Soon panel
  Include short description of what this will do when Twilio is active
  Make it feel like a roadmap item, not a broken feature
Dependency: Twilio requires registered business entity. Full pipeline is Phase 3.

Task 04 | Enable RLS on all 13 Supabase tables
Status: Pending | Required before any external users touch the app
Time: 1 session
Subtasks:
  Audit all 13 tables and write RLS policies for each
  Test every panel against new policies
  Confirm n8n pipelines still fire with RLS active
  Fix any dual write or localStorage fallback issues found during testing
Dependency: Complete UI overhaul first. Test the finished product, not a transitional state.
Pit stop: While in Supabase, review all table structures. Fix any missing or misnamed columns before multi-user data gets written.

---

PHASE 2 | Stabilize and prepare for others
Target: 3 to 5 weeks after Phase 1
Status: Not started

Task 05 | Private beta with 3 to 5 selected artists
Subtasks:
  Choose working, professional, communicative artists
  Onboard each one manually and personally
  Set up a simple feedback channel
  Observe how they use it vs how you expected
Pit stop: Design Acuity Scheduling intake pipe to work for any artist, not just Saul.

Task 06 | Multi-artist data architecture
Dependency: RLS fully tested before starting this
Subtasks:
  Add artist_id column to all tables needing per-artist isolation
  Update RLS policies to filter by artist_id
  Confirm Supabase Auth login flow and ID attachment
  Test data isolation between artists

Task 07 | Artist onboarding flow
Subtasks:
  Build setup wizard: name, rate, specialties, email, booking link
  Store artist profile in Supabase
  Make Inquiry Assistant use each artist's own voice and rate
Pit stop: Voice rules become per-artist settings, not hardcoded prompts.

Task 08 | GetMacri.com landing page
Subtasks:
  Lead with Macrina origin story, then reveal the acronym
  Show Inquiry Assistant demo or screen recording
  Waitlist capture before subscription is live
  Design matches app design language

---

PHASE 3 | Public launch and subscriptions
Target: 2 to 3 months after Phase 2
Status: Not started

Task 09 | Stripe subscription billing
Dependency: Business entity registration required for Stripe payouts
Subtasks:
  Integrate Stripe with monthly subscription and free trial
  Gate premium features behind subscription status
  Free tier generous enough to convert

Task 10 | Voice Agent pipeline | Twilio plus ElevenLabs
Status: Blocked on Twilio
Dependency: Business entity registration, EIN, verified Twilio account
Subtasks:
  Register business entity
  Apply for Twilio number under business account
  Wire Twilio webhook to ElevenLabs voice agent
  Log every call to Supabase via Call Log panel
  Test full intake flow: call in, agent responds, summary writes to CRM

Task 11 | Agent cabinet routing layer
Subtasks:
  HomeBase command bar routes problems to the right agent automatically
  Finance, Session Prep, and Aftercare agents get active AI layers
  Background loops and scheduled automations for non-power-user artists
Pit stop: Instagram DM integration for Concierge. Social inquiries route into MACRI without the artist touching a keyboard.

---

Completed
Sidebar nav shell
Inquiry Assistant | 6 step wizard, Claude API, Send Email, Send Text, Copy, Open in Gmail, Open in Messages
Save to CRM | async, notes field, gold pulse on new card
CRM panel | trading card flip grid, slide-in drawer, Supabase sync
ProjectWall | 10 stage pipeline, stale detection, deposit badges, consultation countdown
CRM Drawer | deposit toggle, 9 milestone checklist, communication log, drag and drop reorder
Mobile bottom nav | 4 tabs, More sheet, scroll lock
Studio Assistant Operations | Intake Coordinator, Concierge, Voice Agent Call Log panel
Finance panel | Color Lab | Aftercare Portal | Agent Queue | Session Prep | HomeBase | Consultation Wizard
Full Supabase migration | 13 tables live | dual write active | localStorage fallback on all reads