import fs from "fs";
import path from "path";

const STATE_FILE = path.resolve(process.cwd(), ".scheduler-state.json");

interface SchedulerState {
  lastEmailSentDate?: string;
  lastSmsSentDate?: string;
  /** email → ISO week id (e.g. 2026-w21) for Pro weekly spiritual weather */
  proWeeklyEmailSent?: Record<string, string>;
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function readState(): SchedulerState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) as SchedulerState;
    }
  } catch {}
  return {};
}

function writeState(state: SchedulerState): void {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("[scheduler] Failed to write state file:", err);
  }
}

export function hasEmailSentToday(): boolean {
  return readState().lastEmailSentDate === today();
}

export function markEmailSentToday(): void {
  const state = readState();
  state.lastEmailSentDate = today();
  writeState(state);
}

export function hasSmsSentToday(): boolean {
  return readState().lastSmsSentDate === today();
}

export function markSmsSentToday(): void {
  const state = readState();
  state.lastSmsSentDate = today();
  writeState(state);
}

export function getIsoWeekId(d = new Date()): string {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-w${week}`;
}

export function hasProWeeklyEmailSent(email: string, weekId: string): boolean {
  return readState().proWeeklyEmailSent?.[email.toLowerCase()] === weekId;
}

export function markProWeeklyEmailSent(email: string, weekId: string): void {
  const state = readState();
  if (!state.proWeeklyEmailSent) state.proWeeklyEmailSent = {};
  state.proWeeklyEmailSent[email.toLowerCase()] = weekId;
  writeState(state);
}
