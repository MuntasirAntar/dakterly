import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";

const COOKIE_NAME = "dakterly_session";
const SEVEN_DAYS = 60 * 60 * 24 * 7;

const FALLBACK_DEV_SECRET = "dakterly-local-preview-session-secret-32chars";

function getKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    return new TextEncoder().encode(FALLBACK_DEV_SECRET);
  }
  return new TextEncoder().encode(secret);
}

async function cookieSecurityOptions() {
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "";
  const origin = hdrs.get("origin") ?? "";
  const isHttps = proto.includes("https") || origin.startsWith("https://") || process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: (isHttps ? "none" : "lax") as "none" | "lax",
    path: "/",
  };
}

// Put a signed token in a cookie. The token holds ONLY the user's id.
export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getKey());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    ...(await cookieSecurityOptions()),
    maxAge: SEVEN_DAYS,
  });
}

// Returns the user id from a valid cookie, or null.
export async function readSession(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null; // expired, tampered with, or signed with another secret
  }
}

export async function deleteSession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    ...(await cookieSecurityOptions()),
    maxAge: 0,
  });
}
