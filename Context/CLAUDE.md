# MACRI — Claude Code Persistent Context

## What MACRI Is
A private studio management app for tattoo artist Saul Gutierrez.
Named after his mother Macrina.
Built for one artist today, designed to scale to many artists tomorrow.
Tagline: Tattoo Studio Pro manages your studio. MACRI thinks with you.

## Stack
React + Vite + Tailwind CSS
Hosted on Vercel: macri.vercel.app
GitHub: github.com/saulgtattoos/macri
Local project: ~/macri
API key: VITE_ANTHROPIC_KEY in .env
ElevenLabs key: VITE_ELEVENLABS_KEY in .env
Data: localStorage now, Supabase June 1
Dev server: npm run dev
Local preview: localhost:5173

## Design Tokens
bg: #0e0e0d
surface: #161614
surface2: #1e1e1b
gold: #c9a96e
text: #e8e6df
muted: #7a786f
success: #7aab8f
danger: #f09595
Fonts: Syne (headings), Inter (body), JetBrains Mono (labels, timestamps, mono)
Border radius: 12px cards, 8px inputs and buttons
All tap targets minimum 44px, prefer 48px on mobile

## Artist Profile
Name: Saul Gutierrez
Studio: Private studio, Elk Grove CA
Rate: $250/hr
Specialties: Watercolor, Black and Gray Realism, Sketch Art, Abstract, Pointillism
Consultation link: SaulsAppointments.as.me/TattooConsultation
Email: saulgtattoos@gmail.com
Signature: Saul | Private Studio, Elk Grove
ElevenLabs Voice ID: Q2Qd4P9qaDNuBFUcFCQr

## Hard Rules for All AI Output
Never use hyphens, dashes, or em dashes anywhere in generated text.
Pipe character allowed only in the signature line.
Text messages: warm tone, no pricing, no links.
Emails signed: Thank You, Saul.

## localStorage Keys
macri_crm_clients — single source of truth for all client and session financial data
macri_drawer_section_order — drawer section reorder
macri_cart_list — cart list for items to order (renamed from macri_dev_queue)
macri_ink_inventory — ink inventory
macri_equipment_credits — equipment credits
macri_consultation_draft — consultation draft
macri_inquiry_draft — inquiry draft
macri_session_prep — session prep checklist items and checked state
macri_welcome_last_seen — home base modal date
macri_consent_submissions — all consent form submissions
macri_gift_cards — all gift card records
macri_promotions — discount and promotion codes
macri_goals — revenue and savings goals
macri_agent_queue — agent drafted messages pending approval

## Single Source of Truth
All session financial data lives inside client records in macri_crm_clients under a sessions array.
No separate session log exists.
Session logging anywhere in the app writes to macri_crm_clients only.

Each session object shape:
{
  id, date, tattooDescription, placement,
  isTouchUp, deposit, depositRefund,
  tattooPrice, amountPaid, tip,
  paymentMethod (Cash | Venmo | Zelle | CashApp | Card | Gift Card | Other),
  giftCardCode, discountCode, originalPrice,
  discountApplied, notes
}

## Constants
STAGES is defined in src/constants/stages.js and imported where needed.
Do not redefine STAGES inside any component file.
Do not export STAGES from any file that also exports React components.

## File Structure Notes
src/pages/Home.jsx — Home Base panel, welcome modal, log session with voice, earnings, goals, streak calendar
src/pages/CRM.jsx — main CRM panel, trading card grid, client drawer, payment history, CSV export and import
src/pages/InquiryAssistant.jsx — 6 step wizard, Claude API, email and text output
src/pages/SessionPrep.jsx — session prep checklist with hands free voice assistant
src/constants/stages.js — STAGES array, single source of truth

## Voice Architecture
ElevenLabs Scribe V2 Realtime — used for speech to text in Session Prep and Log Session
ElevenLabs TTS — used for voice readback using Voice ID Q2Qd4P9qaDNuBFUcFCQr
Claude API — used for parsing voice transcripts into structured data

iOS Audio Unlock Pattern — REQUIRED for all TTS playback on iPhone Safari:
At the top of every mic tap handler, before any async code, add:
  const ttsPlayer = new Audio();
  ttsPlayer.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAEAAQAArwAAAgAQAAAEABAAZGF0YQQAAAAAAA==';
  ttsPlayer.play().catch(() => {});
Then reuse ttsPlayer for actual TTS playback by setting ttsPlayer.src to the blob URL.

Silence Detection Pattern — REQUIRED for all voice input:
After MediaRecorder starts, use setInterval every 100ms sampling AnalyserNode volume.
Stop recording when average volume stays below 8 for 1500ms.
Hard maximum recording time of 15 seconds.
Always create AudioContext inside the tap handler from a direct user gesture.

MediaRecorder MIME Type Priority:
1. audio/webm;codecs=opus
2. audio/webm
3. audio/mp4
4. No type specified as last resort
Use MediaRecorder.isTypeSupported() to check each option.

## Client Tiers for Deposits
Deposit Required: default for all new clients
Trusted Client: friends and proven regulars, no deposit required
Set manually in the CRM drawer per client.

## Vite Fast Refresh Rules
Never mix non-component named exports with React component exports in the same file.
If a constant or array needs to be shared, move it to src/constants and import it.

## Build Workflow Rules
Always read the existing file before making changes.
Do not restructure components unless the brief explicitly asks for it.
Do not rename variables, functions, or state unless the brief explicitly asks for it.
Do not change any behavior, styling, or logic that is not mentioned in the brief.
After every build, confirm no Vite Fast Refresh warnings in the terminal.

## What Is Built and Working
Full sidebar navigation with collapsible sections
Mobile bottom nav bar
MACRI acronym below wordmark in sidebar
Inquiry Assistant: 6 step wizard, Claude API, email and text output, Save to CRM
CRM: trading card flip grid, card front and back, client drawer with all sections
Drawer sections: Client Status, Project Details, Pipeline Stage, Journey Checklist, Client Care, Consultation Log, Communications, Activity and Notes, Payment History
Drawer section reorder: Edit Layout button, drag and drop, saves to localStorage
Save to CRM from Inquiry Assistant
CSV export and import with dedup logic and delete session
Session delete with confirmation in Payment History drawer
Archive system: active grid, Archived tab, unarchive restores to Inquiry stage
Home Base: welcome modal, daily quote with ElevenLabs readout, streak calendar with today highlight, studio pipeline, earnings and metrics, goal progress bars, log session with voice parsing
Session Prep: pre-session checklist with drag to reorder, edit, add, delete, reset, hands free voice assistant with silence detection and ElevenLabs TTS readback

## Known Patterns
Dev Queue renamed to Cart List. Will be wired to Inventory panel later.
Wake word detection planned for native app. Not in browser build.
Accordion sidebar redesign planned after Consultation panel.

## Build Order Remaining
Phase 4 remaining: Log Session voice mic in Home Base, Consultation Panel
Phase 5: Accordion Sidebar Redesign, Consent Forms, Color Lab, Content Studio, Cart List, Inventory
Phase 6 (June 1): Agent Queue UI, Aftercare Agent, Full automation
UI Redesign: after Phase 5 when all panels are feature complete

## Known Integrations
ElevenLabs Scribe V2 Realtime: speech to text in Session Prep and Log Session
Anthropic Claude API: Inquiry Assistant, Session Prep voice parsing, Log Session voice parsing
Acuity Scheduling: planned June roadmap
Square: planned June roadmap
Supabase: migration planned June 1

## Agent Architecture
Four step loop: Trigger, Generate, Queue, Approve and Send
First agent: Aftercare Agent
Agent queue key: macri_agent_queue
Full automation requires Supabase. Do not ship before June 1.