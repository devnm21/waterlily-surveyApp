export function formatSubmittedAt(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function formatAnswer(value: unknown): string {
  if (typeof value === "string") return value.trim() || "No answer";
  if (Array.isArray(value)) {
    return value.length ? value.map(String).join(", ") : "No answer";
  }
  if (value === null || value === undefined) return "No answer";
  return String(value);
}
