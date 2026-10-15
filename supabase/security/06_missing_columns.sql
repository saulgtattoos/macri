-- MACRI | Add the columns the app already sends but the tables never had.
-- Without them every save on these screens was refused (Finance expenses, Finance goals,
-- Content Studio drafts). Only ADDS empty, nullable text columns: no existing row, column,
-- policy or grant changes. Table level grants from 02 already cover new columns.
-- Safe to run more than once. Run in the TEST project first. Live only with Saul's approval.

begin;

alter table public.macri_expenses
  add column if not exists vendor text,
  add column if not exists payment_method text;

alter table public.macri_finance_goals
  add column if not exists notes text;

alter table public.macri_content_drafts
  add column if not exists style text,
  add column if not exists concept text,
  add column if not exists meaning text,
  add column if not exists client_tag text;

commit;

-- Make the API see the new columns right away.
notify pgrst, 'reload schema';

-- Check (read only): expect 7 rows.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('macri_expenses', 'vendor'), ('macri_expenses', 'payment_method'),
    ('macri_finance_goals', 'notes'),
    ('macri_content_drafts', 'style'), ('macri_content_drafts', 'concept'),
    ('macri_content_drafts', 'meaning'), ('macri_content_drafts', 'client_tag'))
order by table_name, column_name;
