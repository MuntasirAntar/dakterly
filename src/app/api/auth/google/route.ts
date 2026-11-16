import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeNextPath } from "@/lib/redirect";
import { createSession } from "@/lib/session";

const FIREBASE_PROJECT_ID = (
  JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8")) as {
    projectId: string;
  }
).projectId;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export async function POST(request: Request) {
  let body: { idToken?: unknown; next?: unknown };
  try {
    body = (await request.json()) as { idToken?: unknown; next?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  if (typeof body.idToken !== "string" || !body.idToken) {
    return NextResponse.json({ error: "Missing Google sign-in token." }, { status: 400 });
  }

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
      return NextResponse.json({ error: "Your Google account must have a verified email address." }, { status: 403 });
    }

    email = payload.email.trim().toLowerCase();
    displayName =
      typeof payload.name === "string" && payload.name.trim().length >= 2
        ? payload.name.trim().slice(0, 80)
        : email.split("@")[0].slice(0, 80);
  } catch {
    return NextResponse.json({ error: "Google sign-in could not be verified. Please try again." }, { status: 401 });
  }

  const existing = await db.user.findUnique({ where: { email } });

  let userId: string;
  if (existing) {
    if (existing.role !== "PATIENT") {
      return NextResponse.json(
        { error: "Staff and admin accounts must log in using their email and password." },
        { status: 403 },
      );
    }
    if (!existing.isActive) {
      return NextResponse.json(
        { error: "This patient account has been suspended. Please contact support." },
        { status: 403 },
      );
    }
    userId = existing.id;
  } else {
    const created = await db.user.create({
      data: {
        name: displayName,
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        role: "PATIENT",
        isActive: true,
      },
    });
    userId = created.id;
    await db.auditLog.create({
      data: {
        userId,
        action: "GOOGLE_PATIENT_SIGNUP",
        entity: "User",
        entityId: userId,
      },
    });
  }

  await createSession(userId);
  const redirectTo = safeNextPath(typeof body.next === "string" ? body.next : null) ?? "/";
  return NextResponse.json({ ok: true, redirectTo });
}
