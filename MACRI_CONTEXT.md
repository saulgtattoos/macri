**Infrastructure Status:**
- Supabase project: MACRI, West US North California
- All 13 tables live, RLS disabled (enable before GetMacri.com launch)
- Full dual write active across every panel
- localStorage remains as fallback on all reads
- crmService.js handles crm_clients_v1
- dataService.js handles all 12 remaining tables via makeService factory
- Supabase migration 100% complete as of May 2026
Data: Supabase Live