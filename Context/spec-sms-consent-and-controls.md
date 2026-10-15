# Plan for review: SMS consent and messaging controls

Status: DRAFT revision 2 for Saul's review (2026-10-15). Nothing built, nothing submitted to Twilio, no funds added, no texts sent.
Twilio status: Blocked, carrier registration incomplete; end to end testing pending.

## 1. Decisions recorded (Saul, 2026-10-15)
- No EIN, so the registration type is **Sole Proprietor A2P 10DLC** (1 campaign, 1 number), registered under Saul's legal name.
- Client facing tattoo business name for now: **Saul G Tattoos**.
- **MACRI** is the app and assistant. Its future business name is undecided. When the assistant is speaking, the text introduces MACRI as Saul's assistant; texts Saul personally reviews and sends as himself identify him as Saul.
- Elk Grove appears in Saul's artist bio where relevant, not in every sign off.
- Initial campaign covers only: **inquiry replies, appointment details, aftercare**. No promotional texts, no review requests (Review Recruiter and Ghost Hunter stay off SMS).
- Exception approved by Saul (2026-10-15): the fixed client disclosure keeps the hyphen in "rolling 7-day period", despite the no hyphen rule for generated client text. This wording exists only in this spec; the consent checkbox, HELP reply and limit are not built or live.
- **3 texts in the last 7 days** per client, enforced on the server, with a clear notice when reached. Never worded "this week". Client disclosures (consent checkbox, HELP reply, campaign) say "Up to 3 texts per rolling 7-day period"; MACRI's own notices to Saul say "3 texts in the last 7 days".
- Texting window: **9 AM to 7 PM in the client's confirmed time zone**. Pacific may be suggested, never assumed; no area code inference; unknown time zone means MACRI asks Saul to confirm it before sending (5.5).
- "Private Studio" wording is replaced with **Saul G Tattoos** or **Saul Gutierrez | Tattoo Artist** depending on context (section 10). Business descriptions never claim an approved studio or a registered business name unless Saul confirms it; if his status changes, accurate wording is allowed.
- A **START** reply removes the opt out block without widening the client's original consent.

## 2. Names
| Name | What it is | Where it is used |
|---|---|---|
| App and assistant: **MACRI** | The software and the assistant that drafts messages for Saul | Inside the app. In texts, only as an introduction such as "this is MACRI, Saul's assistant at Saul G Tattoos". Its future business name is undecided. |
| Client facing business name: **Saul G Tattoos** | The name clients recognize | Every text, the HELP reply, the consent checkbox, the privacy page, campaign samples |
| Legal name for registration | Saul's legal first and last name, contact email, address, and a personal mobile number that receives a verification code | Twilio Sole Proprietor brand only |

Every text names Saul G Tattoos so the sender stays recognizable. Who is speaking decides the introduction: "this is MACRI, Saul's assistant at Saul G Tattoos" when the assistant speaks; "this is Saul from Saul G Tattoos" when Saul sends as himself. Using a trade name other than Saul's own may call for a fictitious business name (DBA) filing with Sacramento County; Saul should confirm with the county. This plan is not legal advice.

## 3. Campaign description and samples (draft)
> Saul Gutierrez, a tattoo artist based in Elk Grove, CA, who uses the name Saul G Tattoos with clients, sends one to one text messages to people who contacted him about a tattoo or booked an appointment with him: replies to their inquiry, appointment details, and aftercare check ins after a session. Messages are drafted with the help of his assistant app, MACRI, and each one is reviewed by Saul before it is sent. No promotional, marketing, or bulk messages. At most 3 texts to a person in the last 7 days.

Frequency disclosure (backed by the enforced limit in 5.4): "Up to 3 texts per rolling 7-day period."

Sample messages (no links, no prices, no dashes; each names Saul G Tattoos; samples 1 and 3 are Saul speaking, sample 2 is the assistant speaking):
1. "Hi [first name], this is Saul from Saul G Tattoos. Thanks for reaching out about your [tattoo idea]. I would love to set up a quick consultation. What days work best for you? Reply STOP to opt out."
2. "Hi [first name], this is MACRI, Saul's assistant at Saul G Tattoos. Your appointment with Saul is on [date] at [time]. Reply here if you need to reschedule."
3. "Hi [first name], it's Saul from Saul G Tattoos. Checking in on day [number] of healing. Keep it clean and moisturized, and text me if anything looks off."

HELP reply: "Saul G Tattoos: for help, email saulgtattoos@gmail.com. Up to 3 texts per rolling 7-day period. Msg & data rates may apply. Reply STOP to opt out."

## 4. Where consent comes from
1. **Consultation request form (public page /consultation/client).** An unchecked checkbox, not required to submit the form, with this text directly beside it:
   > "Yes, Saul G Tattoos may text me about my inquiry, appointments, and aftercare. Up to 3 texts per rolling 7-day period. Msg & data rates may apply. Reply STOP to opt out, HELP for help. See our Privacy Policy and SMS Terms."
   MACRI stores: consent yes or no, the exact wording version, the phone number entered, the client's time zone if given (5.5), date and time, source "consultation form", and the scope (inquiry, appointments, aftercare).
2. **Client texts first.** Scope: inquiry replies only. Recorded with source "client texted first" by Saul in CRM, with the date. Widening to appointments and aftercare needs the form checkbox or a written "YES" by text to a consent question that states the scope and the disclosures.
3. **Nothing else counts.** No verbal consent, no assumed consent from a phone number found elsewhere, no consent for imported clients.

New public page **/privacy** (Privacy Policy and SMS Terms): what is collected, that phone numbers and consent are used only for these messages and never shared or sold for marketing, how to opt out (STOP), HELP, message frequency varies, rates may apply, contact email. Saul reviews the wording; this plan is not legal advice.

## 5. Messaging controls (enforced on the server, not only in the app)
All checks run in the SMS route before any message reaches Twilio. A blocked send changes nothing and says exactly why.

5.1 **Consent required.** The send must name the client. The server looks up that client's consent: it must be "agreed", not withdrawn, and for the same phone number that consented. Otherwise: "Not sent: [name] has not agreed to texts" (or "opted out on [date]").

5.2 **Allowed message types only.** Each send states its type: inquiry reply, appointment details, or aftercare. Any other type is refused. "Client texted first" consent allows only inquiry replies.

5.3 **Agent Queue.** Aftercare Guardian cards may be sent by SMS after Saul approves. Review Recruiter and Ghost Hunter cards are email only: their SMS option is removed.

5.4 **Limit: 3 texts in the last 7 days per client.** Counts texts the provider accepted for that client (any number on the client). The 4th attempt is refused before it reaches Twilio: "Not sent: [name] has had 3 texts in the last 7 days. Next text allowed after [day, time]." The send panel shows "[n] of 3 texts in the last 7 days" before sending. Replies the client sends in do not count.

5.5 **Texting window: 9 AM to 7 PM in the client's confirmed time zone.**
- Each client has a time zone field that is either confirmed or unknown. Pacific (America/Los_Angeles) may be offered as the suggested choice, but it is only stored once Saul (or the client on the form) confirms it.
- The consultation form can ask for city and state; a time zone chosen from it counts as confirmed by the client.
- No area code inference: the phone number never sets or suggests the time zone.
- Unknown time zone: the send is refused with "Not sent: confirm [name]'s time zone first", and the send panel offers to confirm it (Pacific suggested). Nothing is sent until it is confirmed.
- Outside the window: "Not sent: it is [time] for [name] ([time zone]). Texting opens at 9 AM their time."
- 9 AM to 7 PM is narrower than the commonly cited 8 AM to 9 PM guideline, so it stays within it once applied in the client's time.

5.6 **Saul approves every text.** No automatic or scheduled sending (unchanged rule).

## 6. STOP, START and HELP
- **At Twilio:** the number goes into a Messaging Service with Twilio's standard opt out handling. When a client replies STOP (or UNSUBSCRIBE, CANCEL, END, QUIT, STOPALL), Twilio confirms the opt out and refuses any later message to that number (error 21610) until the client replies START. HELP gets the approved HELP reply.
- **In MACRI (so MACRI never tries):**
  1. A new incoming message route (/api/sms-inbound) receives Twilio's notifications of replies. It accepts only requests carrying Twilio's valid signature, and records STOP as "opted out" (date, source "client replied STOP") and HELP as an activity entry. It never sends anything itself.
  2. **START** removes the opt out block and restores exactly the scope the client had before (for example, inquiry replies only). It never adds appointments or aftercare. If the number never had consent in MACRI, START is logged and nothing is enabled.
  3. If Twilio refuses a send with error 21610, MACRI also marks the client opted out.
  4. CRM shows the client's texting status (agreed with scope, not asked, opted out with date) and the send button is disabled with the reason.
  5. Saul cannot override an opt out in MACRI; only the client's START reply re enables texting.
- Client replies other than these keywords are shown as activity on the client (no automatic reply).

## 7. Data (database change, reviewed SQL, test project first)
A table for SMS consent events per client: client, phone number, event (agreed, opted out, agreed again), source, consent wording version, date and time. The current state is the latest event. Owner only access, like the other tables; the inbound route writes with the server key after signature checks. Phone numbers are never shown in logs.

## 8. Order of work (each step needs approval)
1. Settle the open items in section 11 (name and weekly limit are decided).
2. Build on the test project: consent checkbox (and city and state for a confirmed time zone), /privacy page, consent records with scope, server checks (5.1 to 5.5), Agent Queue change, inbound route with signature checks. Tests for every block reason, the 3 texts in the last 7 days limit, the texting window across time zones and the unknown time zone refusal, and STOP then START keeping the original scope.
3. Deploy (SMS still blocked; nothing sends).
4. Saul adds funds and submits the Sole Proprietor registration with the live form and privacy page as proof of opt in. Fees: brand $4.50 once, campaign vetting $15 once and non refundable, campaign $2 a month, plus per text charges.
5. After approval: one test text to Saul's own phone, then STOP and START tests from his phone.

## 9. Order note
Section 10 (wording) can ship on its own, before the SMS work, with its own approval.

## 10. Replacing "Private Studio" (separate small change, with approval)
| Place | Today | Proposed |
|---|---|---|
| Inquiry Assistant email and DM sign off (3 templates and the AI instruction) | "Saul \| Private Studio, Elk Grove" | "Saul Gutierrez \| Tattoo Artist" |
| Inquiry Assistant AI instruction | "a tattoo artist based in Elk Grove, CA with a private studio" | "a tattoo artist based in Elk Grove, CA" (no DBA or studio implied) |
| Public consultation page, thank you lines (2) | "Thank you for choosing Saul Gutierrez Private Studio." | "Thank you for choosing Saul G Tattoos." |
| Public consultation page footer | "Saul Gutierrez \| Private Studio, Elk Grove" | "Saul Gutierrez \| Tattoo Artist" |
| Consultation summary header (printable) | "Saul Gutierrez \| Private Studio, Elk Grove" | "Saul Gutierrez \| Tattoo Artist" |
| Finance profit and loss header | "Saul Gutierrez \| Private Studio \| Elk Grove CA" | "Saul G Tattoos \| Saul Gutierrez" |
| Content Studio caption template | "Studio: Private Studio" | "Saul G Tattoos" |
| CLAUDE.md (description, artist profile, signature rule) | "Private studio ..." | Same replacements, so future generated text follows them |

## 11. Still unresolved
1. Privacy Policy and SMS Terms wording (Saul reviews; not legal advice), and whether to confirm the DBA question with Sacramento County.
2. Saul's earlier Twilio support email (ticket content still unknown).
3. When to build the SMS safeguards (on hold, as is Gmail integration).
4. Section 10 wording change: deployed 2026-10-15 after Saul's review.
