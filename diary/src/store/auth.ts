import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  setSession: (session: Session | null) => void;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  initialized: false,

  setSession: (session) =>
    set({ session, user: session?.user ?? null, initialized: true }),

  init: async () => {
    if (!supabase) {
      set({ session: null, user: null, initialized: true });
      return;
    }
    try {
      const { data } = await supabase.auth.getSession();
      set({
        session: data.session ?? null,
        user: data.session?.user ?? null,
        initialized: true,
      });
      supabase.auth.onAuthStateChange((_event, session) => {
        get().setSession(session);
      });
    } catch (e) {
      console.error("Auth init failed:", e);
      set({ session: null, user: null, initialized: true });
    }
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
