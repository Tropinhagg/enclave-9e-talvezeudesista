import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';

export const SUPABASE_URL = 'https://botxxrnrjwjczkwxsecz.supabase.co';
export const SUPABASE_ANON = 'sb_publishable_-tP1zhFrrfPRyoW3D-a2HA_3vXT0Xmi';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

export const EMAIL_DOMAIN = '@tropinha.local';
