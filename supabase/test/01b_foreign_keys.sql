-- Foreign keys present on live (read from the live API schema description, 2026-10-13).
-- Run after 01_structure.sql. Delete behavior on live was not visible; these use the
-- Postgres default (NO ACTION). Restore order with these keys: parents first
-- (consultations before consultation_references, studio_inventory_v1 before studio_cart_v1).
alter table public.consultation_references
  add constraint consultation_references_consultation_id_fkey
  foreign key (consultation_id) references public.consultations (id);
alter table public.studio_cart_v1
  add constraint studio_cart_v1_inventory_id_fkey
  foreign key (inventory_id) references public.studio_inventory_v1 (id);
