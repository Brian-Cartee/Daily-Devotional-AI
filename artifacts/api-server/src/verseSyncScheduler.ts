import { getEasternDateString } from "./googleSheets";

/** Hourly sync so Eastern midnight rollover always caches today's row. */
export function scheduleDailyVerseSync(syncToday: () => Promise<void>): void {
  const run = async (label: string) => {
    try {
      await syncToday();
      console.log(`[verse-sync] ${label} (${getEasternDateString()})`);
    } catch (err) {
      console.error(`[verse-sync] ${label} failed:`, err);
    }
  };

  void run("startup");
  setInterval(() => void run("hourly"), 60 * 60 * 1000);
}
