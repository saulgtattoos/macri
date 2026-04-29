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
macri_dev_queue — dev queue items and briefs
macri_ink_inventory — ink inventory
macri_equipment_credits — equipment credits
macri_consultation_draft — consultation draft
macri_inquiry_draft — inquiry draft
macri_session_prep — session prep checklist
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
src/pages/CRM.jsx — main CRM panel, trading card grid, client drawer
src/pages/InquiryAssistant.jsx — 6 step wizard, Claude API, email and text output
src/pages/SessionPrep.jsx — session prep checklist with ElevenLabs voice
src/constants/stages.js — STAGES array, single source of truth

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

## Known Integrations
ElevenLabs Scribe V2 Realtime: used in Session Prep for speech to text
Anthropic Claude API: used in Inquiry Assistant for message generation
Acuity Scheduling: planned for June roadmap
Square: planned for June roadmap
Supabase: migration planned for June 1

## Agent Architecture
Four step loop: Trigger, Generate, Queue, Approve and Send
First agent: Aftercare Agent
Agent queue key: macri_agent_queue
Full automation requires Supabase. Do not ship before June 1.