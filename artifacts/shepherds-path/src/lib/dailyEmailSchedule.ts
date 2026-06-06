/** Matches api-server emailScheduler TARGET_HOUR_UTC (12:00 UTC daily send). */
const DAILY_EMAIL_UTC_HOUR = 12;

/** Human-readable local delivery time for the daily verse email. */
export function getDailyEmailDeliveryLabel(): string {
  const sample = new Date();
  sample.setUTCHours(DAILY_EMAIL_UTC_HOUR, 0, 0, 0);
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(sample);
  } catch {
    return "early morning";
  }
}

export function getDailyEmailDeliveryDescription(): string {
  const local = getDailyEmailDeliveryLabel();
  return `Delivered each morning around ${local}`;
}
