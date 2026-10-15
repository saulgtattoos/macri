# Build spec for review: Home "Your studio at a glance" (Part 2)

Status: DRAFT for Saul's review (2026-10-14). Not approved to build. Visual reference: the revision 2 proposal page (private artifact).
Approved direction (Saul, 2026-10-14): count both "Inquiry" and "New Inquiry" excluding archived; replace Studio Pipeline with the overview and a Full board link; remove the Log a Session button until session logging exists; shortcuts in a fixed order; accurate labels; unavailable instead of zero when data is missing or failed.

## 1. Screen, top to bottom
1. Greeting and today's date (local time).
2. Shortcuts, in this order: Inquiry Assistant (gold), CRM, Project Wall, Finances, Session Prep, Agent Queue. Plain buttons, at least 48px tall, wrap on small screens.
3. Panel "Your studio at a glance", with a "Full board" link to Project Wall:
   - Four tiles, each opening the screen that holds the records:
     | Tile | Label and sub line | Opens |
     |---|---|---|
     | A | **Inquiries awaiting a response**, "as recorded in MACRI" | CRM, showing those clients |
     | B | **Agent cards to review**, "drafts waiting for your approval" | Agent Queue |
     | C | **Projects marked scheduled**, "N consults, N tattoos" | Project Wall |
     | D | **Supplies running low**, "at or below your low stock level" (number grey when 0) | Supplies |
   - Today line (see 3.5).
   - Recent activity: the 3 newest entries, one line each, with a CRM link.
4. Earnings (Week, Month, YTD) beside Goals.
5. Session Days calendar, full width.
6. Daily quote with Read aloud, as a quiet line at the bottom.
7. Unchanged: sidebar, welcome message.
Removed: "Today at a Glance" tiles (merged into the Today line), "Studio Pipeline" (replaced by the overview and Full board), "Log a Session" button (opened Session Prep, which does not log sessions).

## 2. Missing or failed data
- Every number has three states: loading (shows "..."), available (the number, including a real 0), unavailable (shows "Unavailable" in grey with a short reason on hover/tap, for example "Could not reach the database").
- A number is unavailable when its query fails, or when the data came from the device copy because the database could not be reached. It never shows 0 in those cases.
- Each item is independent: one failed source does not blank the others.
- Implementation note: the loaders Home uses return an explicit result ({ ok, rows, source }) so Home can tell "database, zero rows" from "fallback to device". No change to how other screens load data.

## 3. Definitions (time zone: the device's local time, California in practice)

### 3.1 Inquiries awaiting a response (as recorded in MACRI)
- Clients (crm_clients_v1) whose stage is "Inquiry" or "new_inquiry" (archived clients have stage "archived" and are therefore excluded),
- minus those with a response recorded: a reply in macri_replies with status sent, or the journey step "response sent" ticked.
- The label states it is what MACRI has recorded; replies sent outside MACRI and never marked are not known.

### 3.2 Agent cards to review
- Count of macri_agent_queue cards with status "pending". Reading it never runs the agents.

### 3.3 Projects marked scheduled
- Clients whose Project Wall stage (project_stage) is consultation_scheduled or tattoo_scheduled, shown as "N consults, N tattoos". Archived clients excluded.
- Counts only. Dates are not shown: consult dates are kept only on the device and no tattoo appointment date field exists.

### 3.4 Supplies running low
- macri_inventory items whose quantity is at or below their low stock level (same rule as Supply Sentry). Items with a blank quantity or level are not counted and are listed as "N items missing a count" if any.

### 3.5 Today line
- Today's Daily Brief numbers are replaced because they are not reliable: its "Sessions" and "Projected revenue" read the Finance ledger with a date format the ledger's imports do not use (always 0), and its "Intake" counts unfinished Agent Queue cards (same as tile B), not intake forms.
- New Today line, from client payment records (client.sessions, the records CRM's Payment History shows):
  - "Today, Oct 14: N sessions recorded" (sessions dated today)
  - "$X collected" (sum of amount paid on those sessions; tips shown separately only if not zero)
- No projected revenue: MACRI has no schedule of future sessions to project from.
- The database function get_daily_brief is left in place (no live change); Home stops using it.

### 3.6 Earnings
- Source: client payment records (client.sessions), the same records as the Today line, CRM Payment History, and the calendar. Not the Finance ledger (sessions_v4); the two can differ until the one ledger decision. The panel says "From client payment records" with a link to Finances.
- Periods (local dates, by session date):
  - Week: Monday through today.
  - Month: the 1st of this month through today.
  - YTD: January 1 through today. (Today's code runs to December 31; sessions dated in the future would be counted. Fixed here.)
- Figures:
  - Revenue = sum of "amount paid" on sessions in the period. Tips excluded. Deposits and refunds are not handled separately (deposit recognition is an unresolved business rule; not decided here).
  - Tips = sum of "tip".
  - Avg per session = Revenue / number of sessions in the period; "Unavailable" when there are no sessions (not $0).
  - Tax aside = 28% of Revenue, labelled "28% rule, an estimate, not tax advice".

### 3.7 Goals
- Unchanged behavior (saved on this device, measured against this month's Revenue). Labelled "Saved on this device". Goal syncing remains a separate decision.

### 3.8 Session Days calendar
- Days with at least one session in client payment records. These dates sync with the client records.
- If clients came from the device copy because the database could not be reached, the calendar shows "Showing this device's copy" instead of presenting it as current.

### 3.9 Recent activity
- The 3 newest activity entries across all clients (by timestamp), formatted "Date · Client · entry". Each opens that client in CRM.

## 4. Stage compatibility for Mark as sent and Undo (database change, test project first)
Problem: Mark as sent moves only "Inquiry" to "Inquiry Response". Clients created in CRM use "new_inquiry" and are never moved.
- New reviewed SQL 08_reply_stage_compat.sql (replaces the two functions from 07; same rules otherwise):
  - stage "Inquiry" moves to "Inquiry Response" (as now).
  - stage "new_inquiry" moves to "awaiting_response", and project_stage "new_inquiry" moves to "awaiting_response" (decision D1).
  - The reply record keeps what changed for both fields (adds project_stage_before and project_stage_after), so Undo restores each field only if it still has the value the confirmation set.
- The full stage name migration (one set of names everywhere) stays a separate, later step.
- Rollback: rerun 07 (functions return to the previous behavior; the two added columns stay, unused).

## 5. Not in this build
Full stage migration, synced appointment dates or Acuity, session logging (/log) and its Home button, goal syncing, the one ledger decision, workspaces and chat, Stencil Studio.

## 6. Tests and verification
- Unit tests (pure functions): reply pending rule (both stage names, archived excluded, sent reply or ticked step counts as responded), scheduled counts, low supplies (blank values), Today and Earnings periods (Week from Monday, Month to date, YTD to today, future sessions excluded, average unavailable with no sessions), unavailable states.
- SQL tests (in memory database): 08 moves "new_inquiry" in both fields and records it; Undo restores only unchanged fields; 07 behavior otherwise unchanged; access rules unchanged.
- Test project: apply 08, run the reply checks again plus check:access.
- Browser (Claude in Chrome, localhost against the test project, Saul signs in): every tile and link, shortcuts order, unavailable state when the database is unreachable, phone width.
- Live: 08 applied by Saul with approval, deploy with separate approval, then a read only check of Home.

## 7. Decisions for Saul
- D1: When a "new_inquiry" client is marked sent, move them to "Awaiting Response" (awaiting the client's reply), in both CRM and Project Wall? Proposed: yes.
- D2: Replace the Daily Brief Today numbers with "sessions recorded today" and "collected today" from client payment records, and drop its "Intake" number (a duplicate of Agent cards)? Proposed: yes.
- D3: YTD runs January 1 through today (excluding future dated sessions)? Proposed: yes.
- D4: "Projects marked scheduled" counts Project Wall stages Consult Scheduled and Tattoo Scheduled? Proposed: yes.
