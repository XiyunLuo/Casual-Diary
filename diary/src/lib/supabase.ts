import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { axiosFetch } from "@/lib/http-client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          fetch: axiosFetch,
        },
      })
    : null;
