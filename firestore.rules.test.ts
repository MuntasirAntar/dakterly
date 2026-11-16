import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const rulesPath = path.join(process.cwd(), "firestore.rules");
const blueprintPath = path.join(process.cwd(), "firebase-blueprint.json");

const rules = fs.readFileSync(rulesPath, "utf-8");
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, "utf-8")) as {
  entities: Record<string, { properties: Record<string, { maxLength?: number; pattern?: string }> }>;
  firestore: Record<string, unknown>;
};

describe("Firestore Security Rules & Blueprint Synchronicity (Dirty Dozen Guards)", () => {
  test("1. Uses rules_version = '2' and top-level default deny safety net", () => {
    expect(rules).toMatch(/rules_version\s*=\s*'2';/);
    expect(rules).toContain("match /{document=**} {\n      allow read, write: if false;\n    }");
  });

  test("2. Covers every collection defined in firebase-blueprint.json plus /test/{docId}", () => {
    const collections = Object.keys(blueprint.firestore).map((p) => p.split("/")[1]);
    for (const col of collections) {
      expect(rules).toContain(`match /${col}/`);
    }
    expect(rules).toContain("match /test/{docId}");
  });

  test("3. Enforces verified email check on bootstrapped admin (anti-email-spoofing)", () => {
    expect(rules).toContain("request.auth.token.email_verified == true");
    expect(rules).toContain("kingalone2345@gmail.com");
  });

  test("4. Enforces strict ID poisoning guard across single-doc operations", () => {
    expect(rules).toContain("id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$')");
    expect(rules).toContain("allow get: if isValidId(");
  });

  test("5. Synchronizes maxLength and pattern regexes with firebase-blueprint.json", () => {
    const doctorProps = blueprint.entities.Doctor.properties;
    expect(rules).toContain(`data.name.size() <= ${doctorProps.name.maxLength}`);
    expect(rules).toContain(`isOptionalString(data.photoUrl, 0, ${doctorProps.photoUrl.maxLength})`);
    expect(rules).toContain(`isOptionalString(data.bio, 0, ${doctorProps.bio.maxLength})`);

    const clinicProps = blueprint.entities.Clinic.properties;
    expect(rules).toContain(`data.name.size() <= ${clinicProps.name.maxLength}`);
    expect(rules).toContain(`data.address.size() <= ${clinicProps.address.maxLength}`);
  });

  test("6. Prevents privilege escalation & self-unbanning on /users", () => {
    expect(rules).toContain("incoming().role == 'PATIENT'");
    expect(rules).toContain("incoming().role == existing().role");
    expect(rules).toContain("incoming().isActive == existing().isActive");
  });

  test("7. Enforces atomic SlotLock <-> Appointment synchronization (existsAfter / getAfter)", () => {
    expect(rules).toContain("existsAfter(/databases/$(database)/documents/slotLocks/");
    expect(rules).toContain("existsAfter(/databases/$(database)/documents/appointments/");
    expect(rules).toContain("getAfter(/databases/$(database)/documents/slotLocks/");
  });

  test("8. Locks terminal appointment states and forbids clinic state shortcutting", () => {
    expect(rules).toContain("!isTerminalAppointmentStatus(existing().status)");
    expect(rules).toContain("isValidClinicAdminTransition(existing().status, incoming().status)");
    expect(rules).toContain("isClinicAdminFor(existing().clinicId)");
  });

  test("9. Prohibits shadow fields with strict hasAll/hasOnly and affectedKeys().hasOnly()", () => {
    expect(rules).toContain("data.keys().hasAll(");
    expect(rules).toContain("data.keys().hasOnly(");
    expect(rules).toContain("incoming().diff(existing()).affectedKeys().hasOnly(");
  });

  test("10. Prohibits blanket PII reads on /admins, /users, /clinicInvites, /appointments, /auditLogs, /clinicInquiries", () => {
    const piiCollections = ["admins", "users", "clinicInvites", "appointments", "auditLogs", "clinicInquiries"];
    for (const col of piiCollections) {
      const start = rules.indexOf(`match /${col}/`);
      const next = rules.indexOf("\n    match /", start + 1);
      const block = next === -1 ? rules.slice(start) : rules.slice(start, next);
      expect(block).not.toMatch(/allow\s+(read|list|get)\s*:\s*if\s+(true|isSignedIn\(\))\s*;/);
    }
    expect(rules).not.toMatch(/allow\s+read\s*:\s*if\s+isSignedIn\(\)\s*;/);
  });

  test("11. Enforces immutable audit logs and appointments history (allow delete: if false)", () => {
    const deleteFalseCount = (rules.match(/allow delete: if false;/g) ?? []).length;
    expect(deleteFalseCount).toBeGreaterThanOrEqual(5);
  });

  test("12. Validates Dirty Dozen rejection invariants for clinic data separation & timestamps", () => {
    expect(rules).toContain("incoming().createdAt == request.time");
    expect(rules).toContain("data.updatedAt == request.time");
    expect(rules).toContain("incoming().createdAt == existing().createdAt");
  });
});
