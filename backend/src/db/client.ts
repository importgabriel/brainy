import { createClient } from "@supabase/supabase-js";

const url  = process.env.SUPABASE_URL;
const key  = process.env.SUPABASE_SECRET_KEY; // secret key — bypasses RLS for server ops

if (!url || !key) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY env vars");
}

// Server-side client (secret key) — use only in tool handlers, never expose to widget
export const db = createClient(url, key, {
  auth: { persistSession: false },
});

// User-scoped client — enforces RLS using the user's JWT (accessToken is still a JWT)
export function userDb(accessToken: string) {
  return createClient(url!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
