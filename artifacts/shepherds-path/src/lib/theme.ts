import { createContext, useContext } from "react";
import { isNativeWebViewShell } from "@/lib/platform";

export type AppTheme = "light" | "dark" | "sanctuary";

const STORAGE_KEY = "sp-theme";

const THEME_CLASSES = ["dark", "light", "sanctuary"] as const;

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
  const effective = isNativeWebViewShell() ? "dark" : theme;

  root.classList.remove(...THEME_CLASSES);

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
