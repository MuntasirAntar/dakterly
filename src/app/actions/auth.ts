"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { homePathFor } from "@/lib/auth";

// "values" sends what the person typed back to the form, because React clears
// the form after every submit. (Passwords are never sent back.)
export type FormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
      values?: { name?: string; email?: string; phone?: string };
    }
  | undefined;

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(20, "Phone number is too long").optional(),
  password: z.string().min(8, "Use at least 8 characters").max(72, "Password is too long"),
  consent: z.literal("on", { message: "You must accept the privacy policy to register" }),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Compared against when the email doesn't exist, so a wrong email and a
// wrong password take about the same time (does not reveal which emails exist).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    consent: formData.get("consent"),
  });
  const values = { name: text(formData, "name"), email: text(formData, "email"), phone: text(formData, "phone") };
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, values };
  }
  const { name, email, phone, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists. Try logging in.", values };

  const user = await db.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash: await bcrypt.hash(password, 10),
      role: "PATIENT", // always PATIENT here. Never take the role from the form.
    },
  });

  await createSession(user.id);
  redirect("/");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const values = { email: text(formData, "email") };
  if (!parsed.success) return { error: "Enter your email and password.", values };
  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk || !user.isActive) {
    return { error: "Invalid email or password.", values };
  }

  await createSession(user.id);
  redirect(homePathFor(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
