-- MACRI | Undo 06_missing_columns.sql.
-- WARNING: dropping a column deletes what was saved in it (expense vendor and payment
-- method, goal notes, Content Studio draft details). Export those tables first.
-- Touches no other columns, rows or access rules; row level security stays on.
-- After this, saves on those screens fail again until 06 is reapplied.

begin;

alter table public.macri_expenses
  drop column if exists vendor,
  drop column if exists payment_method;

alter table public.macri_finance_goals
  drop column if exists notes;

alter table public.macri_content_drafts
  drop column if exists style,
  drop column if exists concept,
  drop column if exists meaning,
  drop column if exists client_tag;

commit;

notify pgrst, 'reload schema';
