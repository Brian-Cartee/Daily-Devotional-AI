import fs from "fs";
import path from "path";

const STATE_FILE = path.resolve(process.cwd(), ".scheduler-state.json");

interface SchedulerState {
  lastEmailSentDate?: string;
  lastSmsSentDate?: string;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
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
