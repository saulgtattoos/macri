-- MACRI TEST project: synthetic data only (invented names, example.test emails, 555 numbers).
-- Run in the TEST project after 01_structure.sql. Never run against live. Safe to run twice.
-- Every table gets at least one row so access checks can prove rows exist but are hidden.

begin;

insert into public.crm_clients_v1
  (id, name, email, phone, tattoo_idea, style, placement, size, stage, status, project_stage,
   sessions, created_at, updated_at, deposit_received, deposit_status, notes)
values
  ('test-client-1', 'Test Client One', 'client.one@example.test', '555-0101', 'Synthetic koi study',
   'Watercolor', 'Forearm', 'Medium', 'Scheduled', 'active', 'Scheduled',
   jsonb_build_array(jsonb_build_object(
     'id', 'test-session-1', 'date', to_char((now() at time zone 'America/Los_Angeles')::date, 'YYYY-MM-DD'),
     'tattooDescription', 'Synthetic koi study', 'placement', 'Forearm', 'isTouchUp', false,
     'deposit', 100, 'depositRefund', 0, 'tattooPrice', 500, 'amountPaid', 500, 'tip', 50,
     'paymentMethod', 'Cash', 'giftCardCode', '', 'discountCode', '', 'originalPrice', 500,
     'discountApplied', 0, 'notes', 'Synthetic record')),
   now(), now(), true, 'received', 'Synthetic record'),
  ('test-client-2', 'Test Client Two', 'client.two@example.test', '555-0102', 'Synthetic rose sketch',
   'Sketch Art', 'Shoulder', 'Small', 'Consultation', 'active', 'Consultation',
   '[]'::jsonb, now(), now(), false, 'pending', 'Synthetic record'),
  ('test-client-3', 'Test Client Three', 'client.three@example.test', '555-0103', 'Synthetic portrait',
   'Black and Gray Realism', 'Calf', 'Large', 'Completed', 'active', 'Completed',
   '[]'::jsonb, now(), now(), true, 'received', 'Synthetic record')
on conflict (id) do nothing;

insert into public.sessions_v4 (id, name, date, style, total, tip, payment, client_id, client_name, placement, created_at)
values
  ('test-session-1', 'Test Client One', to_char((now() at time zone 'America/Los_Angeles')::date, 'MM/DD/YYYY'),
   'Watercolor', 500, 50, 'Cash', 'test-client-1', 'Test Client One', 'Forearm', now()),
  ('test-session-2', 'Test Client Three', '01/15/2026', 'Black and Gray Realism', 750, 0, 'Zelle',
   'test-client-3', 'Test Client Three', 'Calf', now())
on conflict (id) do nothing;

insert into public.macri_agent_queue (id, agent_name, agent_type, client_id, client_name, subject, draft_message, channel, status, created_at)
values ('test-agent-1', 'Aftercare Agent', 'aftercare', 'test-client-1', 'Test Client One',
        'Synthetic check in', 'Synthetic draft message for testing.', 'email', 'pending', now())
on conflict (id) do nothing;

insert into public.macri_cart (id, name, brand, quantity_needed, estimated_cost, where_to_buy, status, created_at)
values ('test-cart-1', 'Synthetic gloves', 'Test Brand', 2, 30, 'Test Supplier', 'to-order', now())
on conflict (id) do nothing;

insert into public.macri_colorlab_brands (id, name, website, notes, created_at)
values ('test-brand-1', 'Test Ink Brand', 'https://example.test', 'Synthetic record', now())
on conflict (id) do nothing;

insert into public.macri_colorlab_inks (id, name, brand, color_hex, color_family, in_stock, created_at)
values ('test-ink-1', 'Synthetic Teal', 'Test Ink Brand', '#2a9d8f', 'Blue', true, now())
on conflict (id) do nothing;

insert into public.macri_colorlab_palettes (id, name, ink_ids, notes, created_at)
values ('test-palette-1', 'Synthetic Palette', '["test-ink-1"]'::jsonb, 'Synthetic record', now())
on conflict (id) do nothing;

insert into public.macri_content_drafts (id, client_id, client_name, image_description, instagram_caption, hashtags, created_at)
values ('test-draft-1', 'test-client-3', 'Test Client Three', 'Synthetic image', 'Synthetic caption', '["#test"]'::jsonb, now())
on conflict (id) do nothing;

insert into public.macri_content_hashtags (id, tag, created_at)
values ('test-tag-1', '#synthetictest', now())
on conflict (id) do nothing;

insert into public.macri_expenses (id, date, description, amount, category, deductible, notes, created_at)
values ('test-expense-1', '2026-10-01', 'Synthetic supplies', 45, 'Supplies', false, 'Synthetic record', now())
on conflict (id) do nothing;

insert into public.macri_finance_goals (id, month, target_amount, created_at)
values ('test-goal-1', '2026-10', 5000, now())
on conflict (id) do nothing;

insert into public.macri_inventory (id, name, category, brand, supplier, unit_cost, quantity, low_stock_threshold, unit, created_at)
values ('test-inventory-1', 'Synthetic needles', 'Needles', 'Test Brand', 'Test Supplier', 1.5, 40, 10, 'box', now())
on conflict (id) do nothing;

insert into public.macri_session_prep (id, text, checked, sort_order, created_at)
values ('test-prep-1', 'Synthetic prep item', false, 0, now())
on conflict (id) do nothing;

insert into public.studio_inventory_v1 (id, item_name, category, supplier_name, current_qty)
values ('00000000-0000-4000-8000-000000000001', 'Synthetic ink caps', 'Supplies', 'Test Supplier', 100)
on conflict (id) do nothing;

insert into public.studio_cart_v1 (id, inventory_id, qty_to_order, status)
values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 1, 'pending')
on conflict (id) do nothing;

insert into public.consultations (id, client_id, concept, placement, style, status)
values ('00000000-0000-4000-8000-000000000003', 'test-client-2', 'Synthetic consultation', 'Shoulder', array['Sketch Art'], 'active')
on conflict (id) do nothing;

insert into public.consultation_references (id, consultation_id, client_id, reference_url, client_note)
values ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003', 'test-client-2',
        'https://example.test/reference.png', 'Synthetic reference')
on conflict (id) do nothing;

commit;
