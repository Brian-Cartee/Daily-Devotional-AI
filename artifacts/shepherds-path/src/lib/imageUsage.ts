import { isProVerifiedLocally } from "@/lib/proStatus";

const IMAGE_USAGE_KEY = "sp_image_usage";
export const IMAGE_FREE_LIMIT = 3;

interface ImageUsageData {
  date: string;
  count: number;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function getImageUsage(): ImageUsageData {
  try {
    const raw = localStorage.getItem(IMAGE_USAGE_KEY);
    if (!raw) return { date: today(), count: 0 };
    const data = JSON.parse(raw) as ImageUsageData;
    if (data.date !== today()) return { date: today(), count: 0 };
    return data;
  } catch {
    return { date: today(), count: 0 };
  }
}

export function canGenerateImage(): boolean {
  if (isProVerifiedLocally()) return true;
  return getImageUsage().count < IMAGE_FREE_LIMIT;
}

export function recordImageGeneration(): void {
  if (isProVerifiedLocally()) return;
  const usage = getImageUsage();
  localStorage.setItem(IMAGE_USAGE_KEY, JSON.stringify({
    date: today(),
    count: usage.count + 1,
  }));
}

export function getRemainingImages(): number {
  if (isProVerifiedLocally()) return Infinity;
  return Math.max(0, IMAGE_FREE_LIMIT - getImageUsage().count);
}
