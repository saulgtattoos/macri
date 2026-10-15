# MACRI | Standing Instructions for Claude

Studio management app for tattoo artist Saul Gutierrez (client facing name: Saul G Tattoos), named after his mother Macrina.
Built for one artist today, designed to scale to many artists.
Tagline: Tattoo Studio Pro manages your studio. MACRI thinks with you.
Current progress, decisions and open questions live in MACRI_STATUS.md. Read it at the start of every session and update it at the end.

## Working Rules
1. Inspect before asking. Read the relevant code, this file, MACRI_STATUS.md, recent commits and logs first. Ask Saul only when the answer changes the result and is not in the project.
2. Solve routine problems yourself. Investigate errors, find the cause, fix, rerun checks. If blocked, say what you tried and the exact access or information needed.
3. Finish the full task. Implementation, relevant tests, and verification of the affected workflow, in the browser when possible. Report what passed separately from what could not be verified.
4. Preserve continuity. Update MACRI_STATUS.md each work session. Never put credentials, keys, or client information in this file or MACRI_STATUS.md (the repo is public). Unresolved security findings go only in .private/SECURITY.md (gitignored), never in committed files.
5. Use tokens efficiently. Search narrowly, avoid rereading unchanged files, batch independent checks, run the smallest meaningful set of tests.
6. Make routine technical decisions yourself within scope. Ask Saul about business rules, significant design choices, conflicting requirements, or scope changes.
7. Protect existing work. Run git status before editing. Never reset, overwrite, or discard uncommitted work. Do not push, deploy, rotate credentials, change the live Supabase database, or send client communications without explicit approval in chat.
8. Report outcomes: what changed, what was verified, remaining limits, next practical step. Written code is not a finished task.
9. One feature at a time. Write a short spec and confirm business rules before building anything new.

## Stack
React 19 + Vite + Tailwind CSS 3, React Router 7. Hosted on Vercel (macri.vercel.app). GitHub: saulgtattoos/macri (PUBLIC repository).
Local project: ~/Desktop/macri
Serverless functions in /api (Vercel): send-email.js (Resend), send-sms.js (Twilio), concierge.js (n8n relay), ai/claude.js, ai/tts.js, ai/stt.js, aftercare-link.js (all owner only), aftercare.js (public, signed links, rate limited). Shared helpers in api/_lib (not routes).
Data: Supabase (13+ tables) with localStorage as fallback cache on reads.
Commands: npm run dev (localhost:5173) with npm run dev:api (local /api on 3001), npm run build, npm run lint, npm test (server and database rule tests, no network).
Test project: npm run dev:test and npm run dev:api:test use .env.test.local only (synthetic data); npm run check:access verifies database rules there.
Local dev talks to the LIVE Supabase project. Treat saves during testing as real data.

## Environment Variables (names only, never values; template in .env.example)
Browser (VITE_ prefix, shipped to every visitor): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (publishable key, safe only with RLS).
Server only (Vercel env, never VITE_): OWNER_USER_ID, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, AFTERCARE_LINK_SECRET, CONCIERGE_WEBHOOK_URL, CONCIERGE_SECRET, RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
Rule: any private key goes in server env and is used only from /api. Never prefix a private key with VITE_. Never reference a private key from src (Vite inlines every import.meta.env value it sees).

## Security Model
Owner only: every owner panel sits behind RequireAuth (UI convenience); real enforcement is server side (api/_lib/auth.js requireOwner checks the Supabase session and OWNER_USER_ID) and database policies (supabase/security/02_owner_access.sql, private.is_owner()).
Browser code calls paid services only through src/lib/api.js (claudeFetch, ttsFetch, sttFetch, apiPost). Never call Anthropic, ElevenLabs, Twilio, Resend or n8n directly from src.
Public pages: /consultation/client (no data access) and /care/:sessionId (signed links only for paid features). New public paid features need signing, input caps and rate limits that fail closed.
Database changes go in supabase/security as reviewed SQL, tested with npm test, applied to the test project first, live only with approval. Rollbacks keep row level security on.

## Data Layer
src/lib/crmService.js: clients, table crm_clients_v1, localStorage key macri_crm_clients. toDB uses an explicit column allowlist; add new columns there.
Saves resolve to { ok }. ok false means device only: never show a "saved" confirmation unless ok is true (savedMessage and allOk in src/lib/syncStatus.js). Failures are reported to the DEVICE ONLY DATA banner.
src/lib/dataService.js: makeService(table, lsKey) factory for every other table (sessions_v4, macri_expenses, macri_finance_goals, macri_inventory, macri_cart, Color Lab, Content Studio, session prep, agent queue, studio_inventory_v1, studio_cart_v1).
Known split: session money is stored in BOTH client.sessions (read by Home and CRM) and sessions_v4 (read by Finance). They drift. See MACRI_STATUS.md before touching any money logic.
Home goals use localStorage key macri_goals only (not synced). Finance goals use macri_finance_goals.
Other local only keys (UI state and drafts, not synced): macri_drawer_section_order, macri_consultation_draft, macri_inquiry_draft, macri_welcome_last_seen.

Client session object (inside client.sessions):
{ id, date, tattooDescription, placement, isTouchUp, deposit, depositRefund, tattooPrice, amountPaid, tip, paymentMethod (Cash | Venmo | Zelle | CashApp | Card | Gift Card | Other), giftCardCode, discountCode, originalPrice, discountApplied, notes }

Client deposit tiers (set manually per client in the CRM drawer): Deposit Required is the default for new clients. Trusted Client (friends and proven regulars) needs no deposit.

## Finance Principles (agreed)
ENTER IT ONCE. USE IT EVERYWHERE. One ledger feeds every report.
Future bookings stay separate from earned revenue. Profit stays separate from available cash.
Tax treatment never defaults to immediately deductible.
Deposit recognition is an UNRESOLVED business rule. Do not choose a treatment without Saul.

## Design Tokens
bg #0e0e0d | surface #161614 | surface2 #1e1e1b | gold #c9a96e | text #e8e6df | muted #7a786f | success #7aab8f | danger #f09595
Fonts: Syne (headings), Inter (body), JetBrains Mono (labels, timestamps).
Radius: 12px cards, 8px inputs and buttons. Tap targets minimum 44px, prefer 48px on mobile.

## Artist Profile (public business info)
Saul Gutierrez | Tattoo artist based in Elk Grove, CA | $250/hr
Client facing business name: Saul G Tattoos. MACRI is the app and assistant; its future business name is undecided. Do not describe Saul as running a permitted or registered studio, or imply a registered DBA.
Specialties: Watercolor, Black and Gray Realism, Sketch Art, Abstract, Pointillism
Consultation: SaulsAppointments.as.me/TattooConsultation | Business email: saulgtattoos@gmail.com
Signature: Saul Gutierrez | Tattoo Artist (Elk Grove belongs in the artist bio where relevant, not in every sign off)
ElevenLabs voices (api/_lib/upstream.js): assistant and aftercare are separate settings, both Rachel 21m00Tcm4TlvDq8ikWAM (stock). Saul's cloned voice Q2Qd4P9qaDNuBFUcFCQr needs a paid ElevenLabs plan.

## Hard Rules for All Generated Client Text
Never use hyphens, dashes, or em dashes. Pipe only in the signature line.
Text messages: warm, no pricing, no links. Emails signed: Thank You, Saul.

## Code Rules
Read a file before changing it. Do not restructure, rename, or restyle anything the task does not mention. This includes variables, functions, and state.
STAGES lives only in src/constants/stages.js. Never mix non component exports with component exports (Vite Fast Refresh). Shared constants go in src/constants.
After each change: npm run build and npm run lint, and confirm no Fast Refresh warnings.

## Voice Patterns (required)
iOS audio unlock: at the top of every mic tap handler, before any await, create one Audio element, play a silent wav data URI, and reuse that element for TTS playback (set its src to the TTS blob URL). Reference snippet:
  const ttsPlayer = new Audio();
  ttsPlayer.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAEAAQAArwAAAgAQAAAEABAAZGF0YQQAAAAAAA==';
  ttsPlayer.play().catch(() => {});
Silence detection: after MediaRecorder starts, sample an AnalyserNode every 100ms; stop when average volume stays below 8 for 1500ms; hard max 15s. Create AudioContext inside the tap handler.
MediaRecorder MIME priority: audio/webm;codecs=opus, audio/webm, audio/mp4, then no type. Check with MediaRecorder.isTypeSupported().
Speech to text: ElevenLabs Scribe (scribe_v2). TTS: ElevenLabs. Transcript parsing: Claude API.

## Agent Architecture
Trigger, Generate, Queue, Approve and Send. Nothing is sent to a client without Saul's approval. Queue table: macri_agent_queue.
