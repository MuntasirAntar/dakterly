const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_TRACKED_IPS = 2000;

const hitsByIp = new Map<string, number[]>();

export function checkChatRateLimit(ip: string, nowMs: number = Date.now()): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const key = ip || "unknown";
  const cutoff = nowMs - WINDOW_MS;
  const recent = (hitsByIp.get(key) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = recent[0] ?? nowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - nowMs) / 1000));
    hitsByIp.set(key, recent);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(nowMs);
  hitsByIp.set(key, recent);

  if (hitsByIp.size > MAX_TRACKED_IPS) {
    for (const [entryKey, timestamps] of hitsByIp.entries()) {
      if (timestamps.every((ts) => ts <= cutoff)) {
        hitsByIp.delete(entryKey);
      }
      if (hitsByIp.size <= MAX_TRACKED_IPS) break;
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
