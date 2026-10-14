Open README.md in the root of ~/macri and replace the entire contents with the following:

# MACRI

**Manage. Automate. Create. Rise. Inspire.**

Private studio management app for tattoo artist Saul Gutierrez. Built with React, Vite, and Tailwind CSS. Hosted on Vercel.

---

## What MACRI Does

MACRI is a full studio operating system built specifically for how Saul runs his private tattoo business. Every panel is purpose built for the real workflow of a working tattoo artist.

---

## Panels

### Home Base
Daily command center. Earnings and metrics by week, month, and year. Streak calendar, pipeline overview, and a permanent Log a Session card with voice logging. New clients created here automatically sync to the CRM. CSV import for past client and session history.

### Inquiry Assistant
AI powered response generator. Input a client inquiry, select context and timing, and Claude generates a professional email and text message response. Saves the client and drafted response directly to the CRM. Draft emails are editable from the CRM client drawer before sending.

### CRM
Full client relationship manager. Trading card flip grid with every client. Each client has a slide-in drawer showing contact info, tattoo history, sessions, communications, consultation notes, journey checklist, and aftercare checklist. Supports drag to reorder, CSV export and import, and archiving.

### Session Prep
Pre-session checklist with drag to reorder. Hands free voice assistant powered by ElevenLabs reads the checklist out loud so Saul can prep without touching his phone.

### Consultation Wizard
Eight step consultation flow with a Precision Estimator for pricing. Includes Client Mode window, Artist Vault, reference image uploader, TTS, draft autosave, and PDF export placeholder.

### Project Wall
Nine color coded columns for tracking every project from first inquiry to healed tattoo. Drag and drop cards, Active Only toggle, Import from Notes using Claude AI extraction, and bulk promote from CRM.

### Supplies
Full inventory management. Tracks every supply with quantities, low stock detection, and automatic cart population when something runs low. Cart tab tracks To Order, Ordered, and Purchased items. Purchasing an item automatically increments inventory.

### Color Lab
Ink library, palette builder, brand directory, and AI color analyzer. Upload a tattoo design image and Claude recommends exactly which inks from your owned collection to use, with plain language reasoning for each color. Recommended inks push directly into Session Prep.

### Content Studio
Social media caption generator. Upload a tattoo photo, fill in the concept and meaning, and Claude generates tailored captions for Instagram, Facebook, and TikTok. Drafts save to the client CRM record.

### Finance
Full business financial monitor built on real session data. Five tabs: Overview with SVG bar chart, Income with CSV import for past years, Expenses with deductible tracking and CSV import, P&L statement grouped by tattoo style and expense category with CSV export, and Goals with monthly income targets and progress tracking. Uses 28% tax reserve rule.

---

## Stack

- React plus Vite
- Tailwind CSS
- Anthropic Claude API (claude-sonnet-4-20250514)
- ElevenLabs TTS and STT
- localStorage (Supabase migration June 1)
- Vercel

---

## Design Tokens

| Token | Value |
|---|---|
| Background | #0e0e0d |
| Surface | #161614 |
| Surface 2 | #1e1e1b |
| Gold | #c9a96e |
| Text | #e8e6df |
| Muted | #7a786f |
| Success | #7aab8f |
| Danger | #f09595 |

Fonts: Syne, Inter, JetBrains Mono

---

## Environment Variables

VITE_ANTHROPIC_KEY=your_anthropic_key
VITE_ELEVENLABS_KEY=your_elevenlabs_key

---

## Roadmap

- June 1 — Supabase migration
- June 1 — Agent Queue UI Panel
- June 1 — Aftercare Agent
- June 1 — Full agent automation layer
- July 1 — GetMacri.com public launch
- August — Convention ready
- Pending — UI Redesign
- Pending — Consent Forms System

---

## Artist

Saul Gutierrez
Private Studio | Elk Grove CA
Specialties: Watercolor, Black and Gray, Black and Gray Portrait, Sketch Art, Abstract, Stippled Shading, Color Realism