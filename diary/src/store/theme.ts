import { create } from "zustand";
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from "@/lib/theme";

type ThemeState = {
  theme: ThemeMode;
  initialized: boolean;
  init: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  initialized: false,

  init: () => {
    const theme = loadTheme();
    applyTheme(theme);
    set({ theme, initialized: true });
  },

  setTheme: (theme) => {
    applyTheme(theme);
    saveTheme(theme);
    set({ theme, initialized: true });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    get().setTheme(nextTheme);
  },
}));
