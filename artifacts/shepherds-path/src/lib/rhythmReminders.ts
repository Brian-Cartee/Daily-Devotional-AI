import type { TimeSlot } from "@/lib/faithRhythm";

export interface RhythmPushSettings {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  middayEnabled: boolean;
  streakReminder: boolean;
  weeklySummary: boolean;
}

export const MORNING_TIME_OPTIONS = ["05:00", "06:00", "07:00", "08:00", "09:00", "10:00"] as const;

export function formatReminderTime(t: string): string {
  const [h] = t.split(":").map(Number);
  return h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
}

export function getRhythmReminderPreset(time: TimeSlot, morningTime = "07:00"): RhythmPushSettings {
  switch (time) {
    case "5min":
      return {
        morningEnabled: true,
        morningTime,
        eveningEnabled: false,
        eveningTime: "20:00",
        middayEnabled: false,
        streakReminder: false,
        weeklySummary: false,
      };
    case "15min":
      return {
        morningEnabled: true,
        morningTime,
        eveningEnabled: false,
        eveningTime: "20:00",
        middayEnabled: false,
        streakReminder: true,
        weeklySummary: false,
      };
    case "30min":
      return {
        morningEnabled: true,
        morningTime,
        eveningEnabled: true,
        eveningTime: "20:00",
        middayEnabled: false,
        streakReminder: true,
        weeklySummary: false,
      };
  }
}

export function describeRhythmReminders(time: TimeSlot, morningTime: string): string[] {
  const when = formatReminderTime(morningTime);
  switch (time) {
    case "5min":
      return [`Morning devotional at ${when} — daily verse to start your day`];
    case "15min":
      return [
        `Morning devotional at ${when}`,
        "Streak reminder — a gentle evening nudge if you haven't visited yet",
      ];
    case "30min":
      return [
        `Morning devotional at ${when}`,
        "Evening reflection at 8 PM — close the day with intention",
        "Streak reminder — evening nudge if today's visit is still open",
      ];
  }
}
