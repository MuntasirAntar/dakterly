// After login we may send people back to where they were ("?next=/doctors/d1/book").
// Only same-site paths are allowed, otherwise a link like
// /login?next=https://evil.example could bounce a user to a fake site.
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  return value;
}
