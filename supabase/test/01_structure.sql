-- MACRI TEST project: table structure copied from live on 2026-10-12 (structure only, no data).
-- Run first in the TEST project SQL Editor. Never run against live.

create table if not exists public.consultation_references (
  id uuid not null default gen_random_uuid(),
  consultation_id uuid,
  client_id text not null,
  storage_url text,
  reference_url text,
  source_type text default 'upload'::text,
  client_note text,
  artist_note text,
  archived boolean default false,
  created_at timestamp with time zone default now(),
  PRIMARY KEY (id)
);

create table if not exists public.consultations (
  id uuid not null default gen_random_uuid(),
  client_id text not null,
  type text default 'full_wizard'::text,
  date timestamp with time zone default now(),
  duration text,
  concept text,
  placement text,
  size text,
  style text[],
  color_profile text,
  orientation text,
  inspiration_notes text,
  design_notes text,
  cover_up boolean default false,
  cover_up_description text,
  is_meaningful boolean default false,
  meaning_story text,
  music_genre text[],
  comfort_notes text,
  allergies text,
  skin_conditions text,
  medications text,
  previous_reactions text,
  medical_clearance text,
  pricing_type text,
  estimated_total text,
  estimated_hours text,
  session_estimate_notes text,
  deposit_amount text,
  deposit_status text,
  client_tier text,
  artist_notes text,
  project_rating text,
  strategy_notes text,
  technical_difficulty text,
  execution_plan text,
  post_session_debrief text,
  client_notes text,
  client_likes text,
  client_dislikes text,
  status text default 'active'::text,
  created_at timestamp with time zone default now(),
  PRIMARY KEY (id)
);

create table if not exists public.crm_clients_v1 (
  id text not null,
  name text,
  email text,
  phone text,
  tattoo_idea text,
  style text,
  placement text,
  size text,
  next_action text,
  stage text,
  status text,
  project_stage text,
  project_order integer default 0,
  consultation_count integer default 0,
  journey_checklist jsonb default '[]'::jsonb,
  aftercare_checklist jsonb default '[]'::jsonb,
  consultations jsonb default '[]'::jsonb,
  sessions jsonb default '[]'::jsonb,
  activity_log jsonb default '[]'::jsonb,
  communications jsonb default '[]'::jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  instagram text,
  agent_intake_summary text,
  agent_concierge_message text,
  agent_call_log jsonb not null default '[]'::jsonb,
  deposit_received boolean default false,
  deposit_status text,
  notes text,
  PRIMARY KEY (id)
);

create table if not exists public.macri_agent_queue (
  id text not null,
  agent_name text,
  agent_type text,
  client_id text,
  client_name text,
  subject text,
  draft_message text,
  channel text,
  status text default 'pending'::text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone,
  approved_at timestamp with time zone,
  sent_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_cart (
  id text not null,
  name text,
  brand text,
  quantity_needed numeric default 0,
  estimated_cost numeric default 0,
  where_to_buy text,
  inventory_item_id text,
  status text default 'to-order'::text,
  purchased_at timestamp with time zone,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_colorlab_brands (
  id text not null,
  name text,
  website text,
  supplier_contact text,
  phone text,
  order_url text,
  notes text,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_colorlab_inks (
  id text not null,
  name text,
  brand text,
  color_hex text,
  color_family text,
  notes text,
  in_stock boolean default true,
  last_used timestamp with time zone,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_colorlab_palettes (
  id text not null,
  name text,
  ink_ids jsonb default '[]'::jsonb,
  notes text,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_content_drafts (
  id text not null,
  client_id text,
  client_name text,
  image_description text,
  instagram_caption text,
  facebook_caption text,
  tiktok_caption text,
  hashtags jsonb default '[]'::jsonb,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_content_hashtags (
  id text not null,
  tag text,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_expenses (
  id text not null,
  date text,
  description text,
  amount numeric default 0,
  category text,
  deductible boolean default false,
  notes text,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_finance_goals (
  id text not null,
  month text,
  target_amount numeric default 0,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_inventory (
  id text not null,
  name text,
  category text,
  brand text,
  supplier text,
  unit_cost numeric default 0,
  quantity numeric default 0,
  low_stock_threshold numeric default 2,
  unit text,
  notes text,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.macri_session_prep (
  id text not null,
  text text,
  checked boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.sessions_v4 (
  id text not null,
  name text,
  date text,
  style text,
  total numeric default 0,
  tip numeric default 0,
  payment text,
  client_id text,
  client_name text,
  placement text,
  created_at timestamp with time zone,
  PRIMARY KEY (id)
);

create table if not exists public.studio_cart_v1 (
  id uuid not null default gen_random_uuid(),
  inventory_id uuid not null,
  qty_to_order integer not null default 1,
  status text not null default 'pending'::text,
  added_at timestamp with time zone default now(),
  PRIMARY KEY (id)
);

create table if not exists public.studio_inventory_v1 (
  id uuid not null default gen_random_uuid(),
  item_name text not null,
  category text not null,
  supplier_name text,
  current_qty integer not null default 0,
  pack_size integer not null default 1,
  lead_time_days integer not null default 3,
  avg_weekly_usage numeric not null default 0,
  safety_stock integer not null default 0,
  created_at timestamp with time zone default now(),
  PRIMARY KEY (id)
);
