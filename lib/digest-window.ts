// Pure helper for the weekly-digest worker. Extracted so it can be unit-tested
// without pulling in the whole worker entrypoint. Kept in lib/ (not workers/)
// because it's a domain rule ("Friday at noon, reviewer-local") that can
// reasonably be used from other surfaces — e.g. a future "test my digest"
// preview button in the admin UI.

export function isFridayNoonLocal(
  now: Date,
  timezone: string | null,
): boolean {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      weekday: "short",
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hourStr = parts.find((p) => p.type === "hour")?.value;
    const hour = hourStr === undefined ? NaN : Number(hourStr);
    return weekday === "Fri" && hour === 12;
  } catch {
    // Invalid tz string → fall back to UTC.
    return now.getUTCDay() === 5 && now.getUTCHours() === 12;
  }
}
