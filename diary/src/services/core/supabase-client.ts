import { supabase } from "@/lib/supabase";

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase 未配置，请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY");
  }

  return supabase;
}

export function pageRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}
