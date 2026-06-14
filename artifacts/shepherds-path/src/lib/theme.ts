import { createContext, useContext } from "react";
import { isNativeWebViewShell } from "@/lib/platform";

export type AppTheme = "light" | "dark" | "sanctuary";

const STORAGE_KEY = "sp-theme";

export function getStoredTheme(): AppTheme {
  if (isNativeWebViewShell()) return "dark";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "sanctuary") return v;
  } catch {}
  return "dark";
}

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  // Native shell has no light mode; map it to dark but allow sanctuary.
  const effective: AppTheme =
    isNativeWebViewShell() && theme === "light" ? "dark" : theme;

  root.classList.remove("dark", "light", "sanctuary");

  if (effective === "dark") {
    root.classList.add("dark");
  } else if (effective === "sanctuary") {
    root.classList.add("sanctuary");
  }

  if (!isNativeWebViewShell()) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }

  console.log("Applied theme:", effective, "Classes:", root.className);
}

export interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
