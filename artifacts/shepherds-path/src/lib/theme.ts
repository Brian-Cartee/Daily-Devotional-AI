import { createContext, useContext } from "react";
import { isNativeWebViewShell } from "@/lib/platform";

export type AppTheme = "dark" | "light";

const STORAGE_KEY = "sp-theme";

export function getStoredTheme(): AppTheme {
  if (isNativeWebViewShell()) return "dark";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "dark";
}

export function applyTheme(theme: AppTheme) {
  const effective = isNativeWebViewShell() ? "dark" : theme;
  if (effective === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  if (!isNativeWebViewShell()) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }
}

export interface ThemeContextValue {
  theme: AppTheme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}
