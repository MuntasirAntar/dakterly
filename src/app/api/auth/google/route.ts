import fs from "node:fs";
import path from "node:path";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { BOOTSTRAP_ADMIN_EMAIL } from "@/lib/firebase";
import { safeNextPath } from "@/lib/redirect";
import { createSession, type SessionRole } from "@/lib/session";

const FIREBASE_PROJECT_ID = (
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8")) as {
    projectId: string;
  }
).projectId;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export async function POST(request: Request) {
  let body: { idToken?: unknown; next?: unknown; role?: unknown; clinicId?: unknown; name?: unknown };
  try {
    body = (await request.json()) as {
      idToken?: unknown;
      next?: unknown;
      role?: unknown;
      clinicId?: unknown;
      name?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (typeof body.idToken !== "string" || !body.idToken) {
    return NextResponse.json({ error: "Missing Firebase sign-in token." }, { status: 400 });
  }

  let uid: string;
  let email: string;
  let displayName: string;
  try {
    const { payload } = await jwtVerify(body.idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    if (typeof payload.sub !== "string" || !payload.sub) {
      return NextResponse.json({ error: "Invalid Google account token." }, { status: 401 });
    }
    if (typeof payload.email !== "string" || !payload.email || payload.email_verified !== true) {
      return NextResponse.json({ error: "Your account must have a verified email address." }, { status: 403 });
    }

    uid = payload.sub;
    email = payload.email.trim().toLowerCase();
    displayName =
      typeof body.name === "string" && body.name.trim().length >= 2
        ? body.name.trim().slice(0, 80)
        : typeof payload.name === "string" && payload.name.trim().length >= 2
          ? payload.name.trim().slice(0, 80)
          : email.split("@")[0].slice(0, 80);
  } catch {
    return NextResponse.json({ error: "Sign-in could not be verified. Please try again." }, { status: 401 });
  }

  const requestedRole =
    body.role === "CLINIC_ADMIN" || body.role === "SUPER_ADMIN" || body.role === "PATIENT"
      ? (body.role as SessionRole)
      : "PATIENT";

  const role: SessionRole = email === BOOTSTRAP_ADMIN_EMAIL ? "SUPER_ADMIN" : requestedRole;
  const clinicId = typeof body.clinicId === "string" && role === "CLINIC_ADMIN" ? body.clinicId : null;

  await createSession({
    userId: uid,
    email,
    name: displayName,
    role,
    clinicId,
  });

  const defaultHome = role === "SUPER_ADMIN" ? "/superadmin" : role === "CLINIC_ADMIN" ? "/admin" : "/";
  const redirectTo = safeNextPath(typeof body.next === "string" ? body.next : null) ?? defaultHome;
  return NextResponse.json({ ok: true, redirectTo });
}
