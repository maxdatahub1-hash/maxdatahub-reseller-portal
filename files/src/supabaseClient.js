import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aevfhtzgijrviyympigb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fA71w-GDAX0-dJ6JQNjpSw_7MDBnNAo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
