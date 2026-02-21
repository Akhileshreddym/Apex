/**
 * Convert seconds (as returned by FastF1 timedelta.total_seconds())
 * into a human-readable lap time string: "M:SS.mmm"
 */
export function formatLapTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  const secsStr = secs.toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${secsStr}` : secsStr;
}

/**
 * Convert seconds to a sector time string: "SS.sss"
 */
export function formatSectorTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "—";
  return seconds.toFixed(3);
}

/**
 * Convert degrees (0-360) to a cardinal direction string.
 * FastF1 WindDirection is an integer in degrees.
 */
export function degreesToCardinal(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

/**
 * Format session time (seconds from session start) as H:MM:SS
 */
export function formatSessionTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
