-- Foreign keys present on live (verified in the live catalog, 2026-10-13). Run after 01_structure.sql.
-- Both cascade on delete, as on live. Restore order: parents first
-- (consultations before consultation_references, studio_inventory_v1 before studio_cart_v1).
-- Not reproduced on purpose: live trigger macri_intake_trigger on crm_clients_v1 (an AFTER INSERT
-- Database Webhook to a retired n8n workspace); it is disabled at cutover (see .private).
-- Live has no check constraints and no extra indexes beyond primary and unique keys.
alter table public.consultation_references
  add constraint consultation_references_consultation_id_fkey
  foreign key (consultation_id) references public.consultations (id) on delete cascade;
alter table public.studio_cart_v1
  add constraint studio_cart_v1_inventory_id_fkey
  foreign key (inventory_id) references public.studio_inventory_v1 (id) on delete cascade;
