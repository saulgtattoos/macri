
All projects
MACRI
Studio management app for tattoo artist Saul Gutierrez. React + Vite + Tailwind. Hosted at macri.vercel.app.



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