
All projects
MACRI
Studio management app for tattoo artist Saul Gutierrez. React + Vite + Tailwind. Hosted at macri.vercel.app.



How can I help you today?


Continuing previous discussion
Last message 5 hours ago
Competing with Kwadron's studio management app
Last message 2 days ago
Catching up after a break
Last message 4 days ago
Consultation session save location
Last message 5 days ago
UI overhaul specification
Last message May 21
MACRI project documentation and codebase overview
Last message May 21
Burnout from prolonged MACRI process
Last message May 21
MACRI acronym meaning
Last message May 21
Jon Carvill advising on Project MACRI marketing
Last message May 21
MACRI project documentation and presentation guide
Last message May 21
Mock brand OTP verification issue
Last message May 19
API key environment variable not loading
Last message May 19
Building MACRI creative studio OS architecture
Last message May 19
Implementing work order system for automatic inventory deduction
Last message May 16
MACRI studio management system recap
Last message May 16
Continuing previous conversation
Last message May 15
Instructions
MACRI | Studio Management App for Saul Gutierrez Role: You are the creative director and senior React engineer for MACRI. Always write specs and ask clarifying questions before touching code. One feature at a time. Get it right the first time. Proactively flag faster workflows, better tools, or more efficient approaches whenever you notice I am doing something the hard way. Teach as we build. Stack: React + Vite + Tailwind CSS | Hosted: macri.vercel.app | GitHub: github.com/saulgtattoos/macri | API key: VITE_ANTHROPIC_KEY in .env Design Tokens: bg #0e0e0d | surface #161614 | surface2 #1e1e1b | gold #c9a96e | text #e8e6df | muted #7a786f | success #7aab8f | Fonts: Syne, Inter, JetBrains Mono Artist: Saul Gutierrez | Private studio, Elk Grove CA | $250/hr | Specialties: Watercolor, Black and Gray Realism, Sketch Art, Abstract, Pointillism | Email: saulgtattoos@gmail.com | Booking: SaulsAppointments.as.me/TattooConsultation Output Rules: NEVER use hyphens, dashes, or em dashes in any generated content. Pipe | only in signature lines. Text messages: warm tone, no pricing, no links. Emails: signed “Thank You, Saul.” Whenever a decision, strategy, workflow reasoning, or insight comes up during our sessions that is worth preserving for future reference, flag it by saying "Worth adding to Notes and Ideas" and provide a ready to paste summary so I can drop it directly into my MACRI Notes and Ideas file. Infrastructure: Supabase project MACRI | URL: https://doyqmflzywbqmuhesckw.supabase.co | Region: West US North California | 13 tables live | RLS disabled until GetMacri.com launch | Full dual write active on every panel | localStorage fallback on all reads | crmService.js handles crm_clients_v1 | dataService.js handles all 12 remaining tables via makeService factory n8n instance: macri.app.n8n.cloud | MACRI Intake Summary Pipe: live | MACRI Concierge Message Pipe: live at VITE_CONCIERGE_WEBHOOK ElevenLabs Voice ID: Q2Qd4P9qaDNuBFUcFCQr Built and Working: Sidebar nav shell | Inquiry Assistant (6 step wizard, Claude API, Send Email, Send Text, Copy, Open in Gmail, Open in Messages) | Save to CRM (async, notes field, gold pulse on new card) | CRM panel (trading card flip grid, slide-in drawer, Supabase sync) | ProjectWall (10 stage pipeline, stale detection, deposit badges, consultation countdown) | CRM Drawer (deposit toggle, 9 milestone checklist, communication log with edit and delete, drag and drop reorder) | Mobile bottom nav (4 tabs, More sheet, scroll lock) | Sidebar acronym in JetBrains Mono 9px muted | Studio Assistant Operations (Intake Coordinator with ElevenLabs, Concierge wired to n8n, Voice Agent Call Log) | Finance panel | Color Lab | Aftercare Portal | Agent Queue | Session Prep | HomeBase | Consultation Wizard | Dashes stripped from generated output Pending: Voice Agent Call Log pipeline (Twilio + ElevenLabs) | RLS enable before launch | Concierge regenerate without overwriting previous message Git: Clean. Last commit: 4c13004. Always run git pull before touching code.

Files
1% of project capacity used

macri-roadmap.md
129 lines

md



macri-notes-and-ideas.md
128 lines

md



client-communication-strategy.md
67 lines

md



macri-n8n-pipelines.md
65 lines

md



macri-voice-rules.md
86 lines

md



Supabase Snippet List Public Table Columns.csv
csv


macri-notes-and-ideas.md
7.97 KB •128 lines
Formatting may be inconsistent from source


All projects
MACRI
Studio management app for tattoo artist Saul Gutierrez. React + Vite + Tailwind. Hosted at macri.vercel.app.

MACRI Acronym
Managing Artist, Clients, Revenue, Intelligently.
Referenced in all product copy, GetMacri.com launch content, and any public facing descriptions of the app.

MACRI Origin Story
MACRI is named after Saul's late mother Macrina. The acronym (Managing Artist, Clients, Revenue, Intelligently) emerged from her name, not the other way around. When presenting the platform to anyone for the first time, lead with the human origin before revealing the operational meaning. That sequence creates connection before function, which is the right order.

How can I help you today?

Start a chat to keep conversations organized and re-use project knowledge.
Instructions
MACRI | Studio Management App for Saul Gutierrez Role: You are the creative director and senior React engineer for MACRI. Always write specs and ask clarifying questions before touching code. One feature at a time. Get it right the first time. Proactively flag faster workflows, better tools, or more efficient approaches whenever you notice I am doing something the hard way. Teach as we build. Stack: React + Vite + Tailwind CSS | Hosted: macri.vercel.app | GitHub: github.com/saulgtattoos/macri | API key: VITE_ANTHROPIC_KEY in .env Design Tokens: bg #0e0e0d | surface #161614 | surface2 #1e1e1b | gold #c9a96e | text #e8e6df | muted #7a786f | success #7aab8f | Fonts: Syne, Inter, JetBrains Mono Artist: Saul Gutierrez | Private studio, Elk Grove CA | $250/hr | Specialties: Watercolor, Black and Gray Realism, Sketch Art, Abstract, Pointillism | Email: saulgtattoos@gmail.com | Booking: SaulsAppointments.as.me/TattooConsultation Output Rules: NEVER use hyphens, dashes, or em dashes in any generated content. Pipe | only in signature lines. Text messages: warm tone, no pricing, no links. Emails: signed “Thank You, Saul.” Infrastructure: Supabase project MACRI | URL: https://doyqmflzywbqmuhesckw.supabase.co | Region: West US North California | 13 tables live | RLS disabled until GetMacri.com launch | Full dual write active on every panel | localStorage fallback on all reads | crmService.js handles crm_clients_v1 | dataService.js handles all 12 remaining tables via makeService factory n8n instance: macri.app.n8n.cloud | MACRI Intake Summary Pipe: live | MACRI Concierge Message Pipe: live at VITE_CONCIERGE_WEBHOOK ElevenLabs Voice ID: Q2Qd4P9qaDNuBFUcFCQr Built and Working: Sidebar nav shell | Inquiry Assistant (6 step wizard, Claude API, Send Email, Send Text, Copy, Open in Gmail, Open in Messages) | Save to CRM (async, notes field, gold pulse on new card) | CRM panel (trading card flip grid, slide-in drawer, Supabase sync) | ProjectWall (10 stage pipeline, stale detection, deposit badges, consultation countdown) | CRM Drawer (deposit toggle, 9 milestone checklist, communication log with edit and delete, drag and drop reorder) | Mobile bottom nav (4 tabs, More sheet, scroll lock) | Sidebar acronym in JetBrains Mono 9px muted | Studio Assistant Operations (Intake Coordinator with ElevenLabs, Concierge wired to n8n, Voice Agent Call Log) | Finance panel | Color Lab | Aftercare Portal | Agent Queue | Session Prep | HomeBase | Consultation Wizard | Dashes stripped from generated output Pending: Voice Agent Call Log pipeline (Twilio + ElevenLabs) | RLS enable before launch | Concierge regenerate without overwriting previous message Git: Clean. Last commit: 4c13004. Always run git pull before touching code.

Files
1% of project capacity used

Client Communication Strategy
15 lines

text



macri-voice-rules.txt
34 lines

txt



macri-n8n-pipelines.txt
13 lines

txt



MACRI Notes and Ideas
16 lines

text



Supabase Snippet List Public Table Columns.csv
csv


MACRI Notes and Ideas
1.22 KB •16 lines
Formatting may be inconsistent from source

What are some ideas of files we can save in the future?

Good question. Here are the ones that would actually be useful for MACRI:
Technical reference
	•	Supabase schema snapshot, all 13 tables, column names, types, relationships
	•	n8n pipeline documentation, what each workflow does, webhook URLs, trigger conditions
	•	Component map, what each major component does and where it lives in the file structure
Design decisions
	•	A log of why certain UI choices were made, so we never second guess ourselves or rebuild something we already thought through
Roadmap
	•	Features you want eventually but are not priority yet, ideas that come up mid session that do not belong in the brief
Client communication templates
	•	The text and email templates we have built so they are searchable and referenceable outside the app itself
Changelog
	•	A running list of what shipped and when, useful when you eventually launch GetMacri.com and want to talk about what the product does
The Supabase schema file is probably the most immediately useful one. Next session we could generate that and save it. It would mean I always have exact column names and table structure without you having to remind me.​​​​​​​​​​​​​​​​

Context Folder
All MACRI reference files live in /context inside the 
project root. When updating any file, edit in VS Code, 
save, then delete old version from Claude project Files 
and re-upload the updated one.

MACRI Highway Map | Created May 2026

Phase 1 | Finish the product for yourself | 2 to 4 weeks
UI overhaul is the priority unlock. Until the app feels like something you love opening, nothing else matters.
Tasks: UI overhaul (HomeBase first, then CRM, Pipeline, Inquiry Assistant) | Concierge regenerate fix | Voice Agent holding state | RLS enable on all 13 tables

Phase 2 | Stabilize and prepare for others | 3 to 5 weeks
Private beta with 3 to 5 selected artists | Multi-artist data architecture with artist_id | Onboarding flow for new artists | Acuity Scheduling intake pipe | GetMacri.com landing page with waitlist

Phase 3 | Public launch | 2 to 3 months out
Stripe subscription billing | Twilio voice pipeline (requires business entity registration first) | Agent cabinet routing layer | Instagram DM integration for Concierge

Rule: Do not begin Phase 2 work until Phase 1 feels finished and loved.

---

Concierge | Manual vs Autonomous | May 2026

Current state is manual mode and it works. The Open in Gmail and Open in Messages flow is a standout feature. People love watching it.
Supabase write for agent_concierge_message is parked. It is only useful when an autonomous send agent exists in n8n to act on it.
Ultimate goal: MACRI generates the message, Saul approves it, MACRI sends it. No manual steps after approval.
Autonomous send is a Phase 2 or 3 build depending on priority. The n8n Concierge pipe already exists. Missing piece is the outbound send action at the end of the pipe via Gmail API or Twilio SMS node.

---

Agent Cabinet | Full Vision | May 2026

Seven specialists identified:
Inquiry Assistant | Sales | Live
Concierge | First Touch | Live
Intake Coordinator | Ops | Live
Voice Agent | Phone | Pipeline pending, Twilio blocked until business registration
Finance Agent | Revenue | Panel exists, agent layer not built
Session Prep Agent | Creative | Panel exists, agent layer not built
Aftercare Agent | Retention | Panel exists, agent layer not built

Routing layer (HomeBase command bar) is a Phase 3 build. Not needed while Saul is the only user.

---

Design Direction | UI Overhaul | May 2026

Target feel: Apple meets premium creative operating system. Calm, beautiful, spacious, clear, emotionally intelligent.
Reference: Apple Health scrollable layout. Sections flow naturally. Modular cards with breathing room.
Typography: Dramatic size contrast. Important numbers and labels larger and more intentional. Guided, not flat.
Color: Dark premium base stays. Add Apple-style depth: soft gradients, layering, subtle glass effects, gentle highlights. Not colorful. Not flashy.
HomeBase is the reference panel. Build it first. Roll the language out to CRM, Pipeline, and Inquiry Assistant after.
No cookie cutter AI-generated feel. Every surface should feel considered.

Full App Audit | June 2026
Audited four core files: App.jsx, Home.jsx, Sidebar.jsx, BottomNav.jsx.
All routes in App.jsx match Sidebar.jsx NAV_ITEMS exactly.
BottomNav.jsx 4 primary tabs plus More sheet cover all routes correctly.
Home.jsx loads real data from Supabase with localStorage fallback confirmed active.
ElevenLabs voice ID confirmed correct in Home.jsx.
Design tokens consistent across all four files.
Confirmed Issues Found
Issue 01 | Log Session CTA in HomeBase navigates to /session-prep instead of /log. Wrong destination. /session-prep is creative prep, not session logging.
Issue 02 | No /log route exists in App.jsx or either nav file. Needs to be created.
Issue 03 | showToast is defined in Home.jsx but never called. Dead code. Remove or wire it to a real action.
Non Blocking Observation
Goals progress in HomeBase always measures against thisMonthRevenue regardless of which period is selected in the Earnings card. Switching to Week or YTD does not update goal bars. Worth fixing in a future pass.
Open Architecture Question | Log Session Data Shape
Sessions currently nest inside client records as arrays on the client object.
Two decisions needed before building LogSession.jsx:
Q1 | What fields should a session capture? Current shape is date, amountPaid, tip, tattooDescription. Expand to hours worked, style used, notes, reference images?
Q2 | Keep sessions nested inside client records and pick client from dropdown on log form, or move sessions to their own Supabase table referencing client by ID? Nested write is 30 minutes. New table is a data architecture session.


All projects
MACRI
Studio management app for tattoo artist Saul Gutierrez. React + Vite + Tailwind. Hosted at macri.vercel.app.



How can I help you today?


Continuing previous discussion
Last message 5 hours ago
Competing with Kwadron's studio management app
Last message 2 days ago
Catching up after a break
Last message 4 days ago
Consultation session save location
Last message 5 days ago
UI overhaul specification
Last message May 21
MACRI project documentation and codebase overview
Last message May 21
Burnout from prolonged MACRI process
Last message May 21
MACRI acronym meaning
Last message May 21
Jon Carvill advising on Project MACRI marketing
Last message May 21
MACRI project documentation and presentation guide
Last message May 21
Mock brand OTP verification issue
Last message May 19
API key environment variable not loading
Last message May 19
Building MACRI creative studio OS architecture
Last message May 19
Implementing work order system for automatic inventory deduction
Last message May 16
MACRI studio management system recap
Last message May 16
Continuing previous conversation
Last message May 15
Instructions
MACRI | Studio Management App for Saul Gutierrez Role: You are the creative director and senior React engineer for MACRI. Always write specs and ask clarifying questions before touching code. One feature at a time. Get it right the first time. Proactively flag faster workflows, better tools, or more efficient approaches whenever you notice I am doing something the hard way. Teach as we build. Stack: React + Vite + Tailwind CSS | Hosted: macri.vercel.app | GitHub: github.com/saulgtattoos/macri | API key: VITE_ANTHROPIC_KEY in .env Design Tokens: bg #0e0e0d | surface #161614 | surface2 #1e1e1b | gold #c9a96e | text #e8e6df | muted #7a786f | success #7aab8f | Fonts: Syne, Inter, JetBrains Mono Artist: Saul Gutierrez | Private studio, Elk Grove CA | $250/hr | Specialties: Watercolor, Black and Gray Realism, Sketch Art, Abstract, Pointillism | Email: saulgtattoos@gmail.com | Booking: SaulsAppointments.as.me/TattooConsultation Output Rules: NEVER use hyphens, dashes, or em dashes in any generated content. Pipe | only in signature lines. Text messages: warm tone, no pricing, no links. Emails: signed “Thank You, Saul.” Whenever a decision, strategy, workflow reasoning, or insight comes up during our sessions that is worth preserving for future reference, flag it by saying "Worth adding to Notes and Ideas" and provide a ready to paste summary so I can drop it directly into my MACRI Notes and Ideas file. Infrastructure: Supabase project MACRI | URL: https://doyqmflzywbqmuhesckw.supabase.co | Region: West US North California | 13 tables live | RLS disabled until GetMacri.com launch | Full dual write active on every panel | localStorage fallback on all reads | crmService.js handles crm_clients_v1 | dataService.js handles all 12 remaining tables via makeService factory n8n instance: macri.app.n8n.cloud | MACRI Intake Summary Pipe: live | MACRI Concierge Message Pipe: live at VITE_CONCIERGE_WEBHOOK ElevenLabs Voice ID: Q2Qd4P9qaDNuBFUcFCQr Built and Working: Sidebar nav shell | Inquiry Assistant (6 step wizard, Claude API, Send Email, Send Text, Copy, Open in Gmail, Open in Messages) | Save to CRM (async, notes field, gold pulse on new card) | CRM panel (trading card flip grid, slide-in drawer, Supabase sync) | ProjectWall (10 stage pipeline, stale detection, deposit badges, consultation countdown) | CRM Drawer (deposit toggle, 9 milestone checklist, communication log with edit and delete, drag and drop reorder) | Mobile bottom nav (4 tabs, More sheet, scroll lock) | Sidebar acronym in JetBrains Mono 9px muted | Studio Assistant Operations (Intake Coordinator with ElevenLabs, Concierge wired to n8n, Voice Agent Call Log) | Finance panel | Color Lab | Aftercare Portal | Agent Queue | Session Prep | HomeBase | Consultation Wizard | Dashes stripped from generated output Pending: Voice Agent Call Log pipeline (Twilio + ElevenLabs) | RLS enable before launch | Concierge regenerate without overwriting previous message Git: Clean. Last commit: 4c13004. Always run git pull before touching code.

Files
1% of project capacity used

macri-roadmap.md
129 lines

md



macri-notes-and-ideas.md
128 lines

md



client-communication-strategy.md
67 lines

md



macri-n8n-pipelines.md
65 lines

md



macri-voice-rules.md
86 lines

md



Supabase Snippet List Public Table Columns.csv
csv


macri-notes-and-ideas.md
7.97 KB •128 lines
Formatting may be inconsistent from source


All projects
MACRI
Studio management app for tattoo artist Saul Gutierrez. React + Vite + Tailwind. Hosted at macri.vercel.app.

MACRI Acronym
Managing Artist, Clients, Revenue, Intelligently.
Referenced in all product copy, GetMacri.com launch content, and any public facing descriptions of the app.

MACRI Origin Story
MACRI is named after Saul's late mother Macrina. The acronym (Managing Artist, Clients, Revenue, Intelligently) emerged from her name, not the other way around. When presenting the platform to anyone for the first time, lead with the human origin before revealing the operational meaning. That sequence creates connection before function, which is the right order.

How can I help you today?

Start a chat to keep conversations organized and re-use project knowledge.
Instructions
MACRI | Studio Management App for Saul Gutierrez Role: You are the creative director and senior React engineer for MACRI. Always write specs and ask clarifying questions before touching code. One feature at a time. Get it right the first time. Proactively flag faster workflows, better tools, or more efficient approaches whenever you notice I am doing something the hard way. Teach as we build. Stack: React + Vite + Tailwind CSS | Hosted: macri.vercel.app | GitHub: github.com/saulgtattoos/macri | API key: VITE_ANTHROPIC_KEY in .env Design Tokens: bg #0e0e0d | surface #161614 | surface2 #1e1e1b | gold #c9a96e | text #e8e6df | muted #7a786f | success #7aab8f | Fonts: Syne, Inter, JetBrains Mono Artist: Saul Gutierrez | Private studio, Elk Grove CA | $250/hr | Specialties: Watercolor, Black and Gray Realism, Sketch Art, Abstract, Pointillism | Email: saulgtattoos@gmail.com | Booking: SaulsAppointments.as.me/TattooConsultation Output Rules: NEVER use hyphens, dashes, or em dashes in any generated content. Pipe | only in signature lines. Text messages: warm tone, no pricing, no links. Emails: signed “Thank You, Saul.” Infrastructure: Supabase project MACRI | URL: https://doyqmflzywbqmuhesckw.supabase.co | Region: West US North California | 13 tables live | RLS disabled until GetMacri.com launch | Full dual write active on every panel | localStorage fallback on all reads | crmService.js handles crm_clients_v1 | dataService.js handles all 12 remaining tables via makeService factory n8n instance: macri.app.n8n.cloud | MACRI Intake Summary Pipe: live | MACRI Concierge Message Pipe: live at VITE_CONCIERGE_WEBHOOK ElevenLabs Voice ID: Q2Qd4P9qaDNuBFUcFCQr Built and Working: Sidebar nav shell | Inquiry Assistant (6 step wizard, Claude API, Send Email, Send Text, Copy, Open in Gmail, Open in Messages) | Save to CRM (async, notes field, gold pulse on new card) | CRM panel (trading card flip grid, slide-in drawer, Supabase sync) | ProjectWall (10 stage pipeline, stale detection, deposit badges, consultation countdown) | CRM Drawer (deposit toggle, 9 milestone checklist, communication log with edit and delete, drag and drop reorder) | Mobile bottom nav (4 tabs, More sheet, scroll lock) | Sidebar acronym in JetBrains Mono 9px muted | Studio Assistant Operations (Intake Coordinator with ElevenLabs, Concierge wired to n8n, Voice Agent Call Log) | Finance panel | Color Lab | Aftercare Portal | Agent Queue | Session Prep | HomeBase | Consultation Wizard | Dashes stripped from generated output Pending: Voice Agent Call Log pipeline (Twilio + ElevenLabs) | RLS enable before launch | Concierge regenerate without overwriting previous message Git: Clean. Last commit: 4c13004. Always run git pull before touching code.

Files
1% of project capacity used

Client Communication Strategy
15 lines

text



macri-voice-rules.txt
34 lines

txt



macri-n8n-pipelines.txt
13 lines

txt



MACRI Notes and Ideas
16 lines

text



Supabase Snippet List Public Table Columns.csv
csv


MACRI Notes and Ideas
1.22 KB •16 lines
Formatting may be inconsistent from source

What are some ideas of files we can save in the future?

Good question. Here are the ones that would actually be useful for MACRI:
Technical reference
	•	Supabase schema snapshot, all 13 tables, column names, types, relationships
	•	n8n pipeline documentation, what each workflow does, webhook URLs, trigger conditions
	•	Component map, what each major component does and where it lives in the file structure
Design decisions
	•	A log of why certain UI choices were made, so we never second guess ourselves or rebuild something we already thought through
Roadmap
	•	Features you want eventually but are not priority yet, ideas that come up mid session that do not belong in the brief
Client communication templates
	•	The text and email templates we have built so they are searchable and referenceable outside the app itself
Changelog
	•	A running list of what shipped and when, useful when you eventually launch GetMacri.com and want to talk about what the product does
The Supabase schema file is probably the most immediately useful one. Next session we could generate that and save it. It would mean I always have exact column names and table structure without you having to remind me.​​​​​​​​​​​​​​​​

Context Folder
All MACRI reference files live in /context inside the 
project root. When updating any file, edit in VS Code, 
save, then delete old version from Claude project Files 
and re-upload the updated one.

MACRI Highway Map | Created May 2026

Phase 1 | Finish the product for yourself | 2 to 4 weeks
UI overhaul is the priority unlock. Until the app feels like something you love opening, nothing else matters.
Tasks: UI overhaul (HomeBase first, then CRM, Pipeline, Inquiry Assistant) | Concierge regenerate fix | Voice Agent holding state | RLS enable on all 13 tables

Phase 2 | Stabilize and prepare for others | 3 to 5 weeks
Private beta with 3 to 5 selected artists | Multi-artist data architecture with artist_id | Onboarding flow for new artists | Acuity Scheduling intake pipe | GetMacri.com landing page with waitlist

Phase 3 | Public launch | 2 to 3 months out
Stripe subscription billing | Twilio voice pipeline (requires business entity registration first) | Agent cabinet routing layer | Instagram DM integration for Concierge

Rule: Do not begin Phase 2 work until Phase 1 feels finished and loved.

---

Concierge | Manual vs Autonomous | May 2026

Current state is manual mode and it works. The Open in Gmail and Open in Messages flow is a standout feature. People love watching it.
Supabase write for agent_concierge_message is parked. It is only useful when an autonomous send agent exists in n8n to act on it.
Ultimate goal: MACRI generates the message, Saul approves it, MACRI sends it. No manual steps after approval.
Autonomous send is a Phase 2 or 3 build depending on priority. The n8n Concierge pipe already exists. Missing piece is the outbound send action at the end of the pipe via Gmail API or Twilio SMS node.

---

Agent Cabinet | Full Vision | May 2026

Seven specialists identified:
Inquiry Assistant | Sales | Live
Concierge | First Touch | Live
Intake Coordinator | Ops | Live
Voice Agent | Phone | Pipeline pending, Twilio blocked until business registration
Finance Agent | Revenue | Panel exists, agent layer not built
Session Prep Agent | Creative | Panel exists, agent layer not built
Aftercare Agent | Retention | Panel exists, agent layer not built

Routing layer (HomeBase command bar) is a Phase 3 build. Not needed while Saul is the only user.

---

Design Direction | UI Overhaul | May 2026

Target feel: Apple meets premium creative operating system. Calm, beautiful, spacious, clear, emotionally intelligent.
Reference: Apple Health scrollable layout. Sections flow naturally. Modular cards with breathing room.
Typography: Dramatic size contrast. Important numbers and labels larger and more intentional. Guided, not flat.
Color: Dark premium base stays. Add Apple-style depth: soft gradients, layering, subtle glass effects, gentle highlights. Not colorful. Not flashy.
HomeBase is the reference panel. Build it first. Roll the language out to CRM, Pipeline, and Inquiry Assistant after.
No cookie cutter AI-generated feel. Every surface should feel considered.

Full App Audit | June 2026
Audited four core files: App.jsx, Home.jsx, Sidebar.jsx, BottomNav.jsx.
All routes in App.jsx match Sidebar.jsx NAV_ITEMS exactly.
BottomNav.jsx 4 primary tabs plus More sheet cover all routes correctly.
Home.jsx loads real data from Supabase with localStorage fallback confirmed active.
ElevenLabs voice ID confirmed correct in Home.jsx.
Design tokens consistent across all four files.
Confirmed Issues Found
Issue 01 | Log Session CTA in HomeBase navigates to /session-prep instead of /log. Wrong destination. /session-prep is creative prep, not session logging.
Issue 02 | No /log route exists in App.jsx or either nav file. Needs to be created.
Issue 03 | showToast is defined in Home.jsx but never called. Dead code. Remove or wire it to a real action.
Non Blocking Observation
Goals progress in HomeBase always measures against thisMonthRevenue regardless of which period is selected in the Earnings card. Switching to Week or YTD does not update goal bars. Worth fixing in a future pass.
Open Architecture Question | Log Session Data Shape
Sessions currently nest inside client records as arrays on the client object.
Two decisions needed before building LogSession.jsx:
Q1 | What fields should a session capture? Current shape is date, amountPaid, tip, tattooDescription. Expand to hours worked, style used, notes, reference images?
Q2 | Keep sessions nested inside client records and pick client from dropdown on log form, or move sessions to their own Supabase table referencing client by ID? Nested write is 30 minutes. New table is a data architecture session.

Consultation Architecture Decision | June 2026

MACRI is relationship-aware software. CRM client is the parent of all records.

Five new tables needed:
  consultations | consultation_references | projects | project_sessions | project_references

Key decisions:
  Consultations and projects are separate. A consultation is a conversation.
  A project is a commitment. They must not be conflated.
  Sessions belong to projects, not clients. One client can have multiple active
  projects and sessions must be attributable to the correct project.
  References split into two tables. Consultation refs = what the client brought.
  Project refs = the working set for the active tattoo.
  Project creation is optional after saving a consultation.
  ProjectWall reads from the projects table, one card per project.
  One client can appear on multiple ProjectWall cards simultaneously.

Existing gaps that must be resolved before building:
  Remove the healed stage reset logic in CRM.jsx.
  Migrate nested sessions from crm_clients_v1 to project_sessions.
  Decision needed on reference image storage: Supabase Storage vs URL field.

  Model Strategy | June 2026
Fable 5 evaluated for MACRI runtime. Decision: no. In app Claude calls are short structured tasks where Sonnet 4.6 is faster and 3x cheaper. Fable 5 is the build partner for Phase 1 work, not the runtime engine. Revisit for Phase 3 agent cabinet as an advisor model checking worker agent plans. Consider downgrading ColorLab label reading and transcript matching to Haiku 4.5 for cost.