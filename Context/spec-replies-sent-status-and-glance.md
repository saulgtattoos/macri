# Spec for review: reply sent status, and "Your studio at a glance"

Status: DRAFT for Saul's review (2026-10-14). Not approved to build. No live database change expected.

## Part 1. Opened is not sent

### Problem today
- Inquiry Assistant's Open in Gmail and Open in Messages tick "response sent", move the client from Inquiry to Inquiry Response, and log a sent entry (Messages logs "Text message sent") when the draft is only opened.
- Every status change finds the CRM client by first name in the draft, so two clients with the same first name can be confused, and a client not yet in CRM gets nothing recorded.

### Rules
1. Opening a draft never changes status. It only records that the draft was opened.
2. A reply becomes "sent" in exactly two ways:
   - Saul confirms with **Mark as sent** (for drafts sent from Gmail or Messages).
   - A server send (Resend email, Twilio text) returns success. Success means the service accepted the message, not that it was delivered. The record says "accepted by Resend" or "accepted by Twilio".
3. Every status change is tied to one specific client (by id) and one specific draft. No first name matching for status.
4. One confirmation per draft. A second click, a second tab, or a server send after Mark as sent does not create a second confirmation.
5. Undo reverses one mistaken confirmation and only what it changed. It never deletes or rewrites later activity.
6. Historical records stay exactly as they are and are not treated as verified.

### The reply record
Each generated draft gets an id when it is generated (editing keeps the same id). When it is tied to a client, it is stored in that client's existing communications list with these added fields:

| Field | Meaning |
|---|---|
| draftId | Same id across edits and reopenings |
| status | drafted, opened, sent |
| openedAt | Times the draft was opened, and in which app (Gmail, Messages) |
| sentAt, sentVia | When and how: confirmed by Saul (Gmail draft / Messages), or accepted by Resend / Twilio |
| providerId | Twilio message SID or Resend email id (the email route will return it; today it does not) |
| confirmation | What the sent confirmation changed: whether it ticked "response sent", stage before and after |
| undoneAt | Set when a confirmation is undone (the record is kept) |

### Behavior
**Open in Gmail / Open in Messages**
- Opens the app with recipient and body filled in, exactly as today.
- If the draft is tied to a client: status becomes opened (unless already sent), and the activity log gets "Email draft opened in Gmail" or "Text draft opened in Messages".
- No journey tick, no stage change.
- If the draft is not tied to a client yet: the app still opens; nothing is recorded.

**Mark as sent** (Inquiry Assistant result panel, and the client's Communications section in CRM)
- Shown for a reply that is drafted or opened and tied to a client. In Inquiry Assistant, if the draft is not tied to a client, the button says "Save to CRM first".
- On click (asks once: "Mark this reply as sent?"):
  - status sent, sentAt now, sentVia "confirmed by Saul (Gmail)" or "(Messages)".
  - Ticks "response sent" only if it was not already ticked; records whether it did.
  - Moves Inquiry to Inquiry Response only if the client is at Inquiry; records the stage before.
  - Activity log: "Inquiry reply marked sent by Saul (email)" or "(text)".
- Shown as disabled with "Marked sent [date]" once sent. Saves report device only failures like every other save.

**Server send (Send email via Resend, Send text via Twilio)**
- Marks sent only after the route returns success, using the same rules (tied client, one confirmation per draft), with sentVia "accepted by Resend/Twilio" and the providerId.
- A failed send records nothing.
- Label fix: "Send via Gmail" becomes "Send email" (it uses Resend, not Gmail).

**Undo** (next to "Marked sent", in both places)
- Asks once: "Undo the sent confirmation for this reply?"
- Reverses only what that confirmation changed:
  - Unticks "response sent" only if this confirmation ticked it and no other sent reply for this client exists.
  - Returns the stage to its previous value only if the client is still at the stage this confirmation set. If the client has moved on since, the stage is left alone and the app says so.
- Status returns to opened (or drafted), undoneAt is recorded.
- Adds an activity entry "Sent confirmation undone by Saul"; earlier and later entries are untouched.
- Undo is not offered for server sends (the message really went out).

**Historical records**
- No migration. Existing journey ticks, stages, and log entries are left as they are.
- Replies saved before this change show "status not recorded".
- Anywhere MACRI counts pending replies, the label says it reflects what is recorded in MACRI.

### Tests
- Unit tests for the reply status rules (pure module): open, mark sent, duplicate confirmation, undo with unchanged stage, undo after the client moved on, undo leaving later activity intact, server send success and failure.
- Route test: the email route returns the Resend id; nothing is marked when a route fails.
- Test project: run each flow against synthetic clients, including two clients with the same first name.
- Saul checks in the browser after deploy (deploy needs separate approval).

## Part 2. Your studio at a glance (Home)

A calm card at the top of Home, built only from data MACRI already has. No AI, no chat.

| Item | Source | Wording |
|---|---|---|
| Replies pending | Clients at Inquiry with no sent reply recorded | "N replies pending, as recorded in MACRI". Never claims Saul has not answered outside MACRI. |
| Agent Queue | Cards awaiting review | "N cards awaiting review" with a link |
| Upcoming sessions | Next 7 days | Date and client |
| Recent activity | Last 5 client activity entries | Short lines with dates |

- Each item links to the screen that holds the records.
- Loading and device only states follow the existing sync banner rules.
- "Where we left off" is reserved for real conversation continuity later.

Depends on Part 1 for an accurate pending count. Build Part 1 first.

## Out of scope (separate decisions)
- Session logging (/log) and the shared session data decision.
- Syncing Home goals.
- Workspaces, conversation history, chat that opens dashboards, inbox retrieval, Stencil Studio.

## Open questions for Saul
1. Should repeated opens of the same draft each add an activity entry, or only the first open? (Proposed: only the first, later opens update openedAt.)
2. Is there a time limit on Undo? (Proposed: none.)
3. For Part 2, which stages count as "reply pending": only Inquiry, or also Lead? (Proposed: Inquiry only, matching today's stage change.)
