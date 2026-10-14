import { createClient } from '@supabase/supabase-js'
import { readAuthLinkHash } from './authLinks'
// Read before the client starts: it consumes the email link and clears the address.
export const authLink = readAuthLinkHash(typeof window !== 'undefined' ? window.location.hash : '')
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
// The owner session is kept in this browser so database requests carry it
// (row level security allows only the owner account).
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
export default supabase
