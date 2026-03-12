import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type DemoConfig, COLOR_PRESETS, getDemoConfigFromUrl, saveDemoConfig, loadDemoConfig } from "@/lib/demo";

interface DemoCtx {
  config: DemoConfig;
  update: (patch: Partial<DemoConfig>) => void;
  exit: () => void;
}

const Ctx = createContext<DemoCtx | null>(null);

export function useDemoMode() {
  return useContext(Ctx);
}

const DEFAULT: DemoConfig = {
  isDemo: false,
  churchName: "",
  colorHsl: COLOR_PRESETS[0].hsl,
  colorHex: COLOR_PRESETS[0].hex,
  colorName: COLOR_PRESETS[0].name,
};

function injectTheme(hsl: string) {
  let el = document.getElementById("demo-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "demo-theme";
    document.head.appendChild(el);
  }
  el.textContent = `:root { --primary: ${hsl} !important; --primary-foreground: 0 0% 100% !important; }`;
}

function removeTheme() {
  document.getElementById("demo-theme")?.remove();
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<DemoConfig>(DEFAULT);

  useEffect(() => {
    const fromUrl = getDemoConfigFromUrl();
    if (fromUrl) {
      setConfig(fromUrl);
      saveDemoConfig(fromUrl);
      injectTheme(fromUrl.colorHsl);
      return;
    }
    const fromStorage = loadDemoConfig();
    if (fromStorage) {
      setConfig(fromStorage);
      injectTheme(fromStorage.colorHsl);
    }
  }, []);

  const update = useCallback((patch: Partial<DemoConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...patch };
      saveDemoConfig(next);
      if (patch.colorHsl) injectTheme(patch.colorHsl);
      return next;
    });
  }, []);

  const exit = useCallback(() => {
    setConfig(DEFAULT);
    removeTheme();
    sessionStorage.removeItem("sp_demo_config");
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    url.searchParams.delete("church");
    url.searchParams.delete("color");
    window.history.replaceState({}, "", url.toString());
  }, []);

  return <Ctx.Provider value={{ config, update, exit }}>{children}</Ctx.Provider>;
}
