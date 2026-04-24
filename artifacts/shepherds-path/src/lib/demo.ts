export interface DemoConfig {
  isDemo: boolean;
  churchName: string;
  colorHsl: string;
  colorHex: string;
  colorName: string;
}

export const COLOR_PRESETS = [
  { name: "Shepherd Purple", hsl: "270 50% 30%", hex: "#3b1f7a" },
  { name: "Royal Blue",      hsl: "220 70% 35%", hex: "#1a4a9e" },
  { name: "Forest Green",    hsl: "148 50% 28%", hex: "#1a5c38" },
  { name: "Deep Crimson",    hsl: "0 60% 35%",   hex: "#8b2020" },
  { name: "Midnight Navy",   hsl: "230 65% 22%", hex: "#0f1f52" },
  { name: "Warm Chestnut",   hsl: "25 60% 32%",  hex: "#7a3a10" },
  { name: "Slate",           hsl: "215 30% 30%", hex: "#2d3d52" },
  { name: "Teal",            hsl: "175 50% 28%", hex: "#0f4d47" },
];

const STORAGE_KEY = "sp_demo_config";

export function getDemoConfigFromUrl(): DemoConfig | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.get("demo")) return null;

  const churchName = params.get("church") || "Your Church";
  const colorHex = decodeURIComponent(params.get("color") || "#3b1f7a");
  const preset = COLOR_PRESETS.find(p => p.hex === colorHex) ?? COLOR_PRESETS[0];

  return {
    isDemo: true,
    churchName,
    colorHex: preset.hex,
    colorHsl: preset.hsl,
    colorName: preset.name,
  };
}

export function saveDemoConfig(config: DemoConfig) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadDemoConfig(): DemoConfig | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoConfig;
  } catch {
    return null;
  }
}

export function clearDemoConfig() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function buildDemoUrl(churchName: string, colorHex: string): string {
  const base = window.location.origin;
  const params = new URLSearchParams({
    demo: "1",
    church: churchName,
    color: colorHex,
  });
  return `${base}/?${params.toString()}`;
}

export function buildDemoEmailBody(churchName: string, url: string): string {
  return `Hi there,

I'd love to show you Shepherd's Path — an AI spiritual companion for your congregation.

I've set up a personalized live demo just for ${churchName}. Click the link below to explore it:

${url}

You'll be able to see exactly how it looks with your church name applied, and customize the colors to match your brand — all before signing up.

No commitment required. Just click and explore.

Looking forward to hearing your thoughts.`;
}
