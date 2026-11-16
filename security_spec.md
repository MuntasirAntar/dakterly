# Dakterly Firestore Security Specification (Phase 0 & Phase 2)

## 1. Data Invariants & Relationship Mapping

Master Source of Truth:
- **Platform Admin Authority**: Bootstrapped Super Admin (`kingalone2345@gmail.com` with `email_verified == true`) and explicitly registered `/admins/{userId}` documents.
- **Public Catalog (Zero PII)**: `/clinics/{clinicId}`, `/specialties/{specialtyId}`, `/doctors/{doctorId}`, `/doctorSchedules/{scheduleId}`. Writable exclusively by verified Super Admins (`isSuperAdmin()`).
- **Doctor -> Clinic & Specialty Invariant**: Every `/doctors/{doctorId}` MUST reference an existing `/clinics/{clinicId}` and `/specialties/{specialtyId}` via `exists()`. Every `/doctorSchedules/{scheduleId}` MUST reference an existing `/doctors/{doctorId}`.
- **User Identity & Privilege Invariant (`/users/{userId}`)**:
  - A user creating their own profile MUST set `uid == request.auth.uid`, `isActive == true`, and either `role == 'PATIENT'` (`clinicId == null`) OR claim an active matching `/clinicInvites/{inviteId}` where `email == request.auth.token.email` (`email_verified == true`) and `clinicId == invite.clinicId`.
  - Users can NEVER elevate their own `role`, `clinicId`, `uid`, or `isActive` on update. Only a verified Super Admin can suspend users or modify roles.
- **Booking & Queue Atomicity Invariant (`/appointments/{appointmentId}` & `/slotLocks/{slotLockId}`)**:
  - Zero-PII `/slotLocks/{slotLockId}` (keyed deterministically as `{doctorId}_{YYYY-MM-DD}_{HH-MM}`) prevents double-booking via Firestore transactions and stores no patient PII.
  - Creating an appointment MUST atomically create/claim the matching `/slotLocks/{slotLockId}` in the same transaction (`existsAfter` / `getAfter` verified), with `patientId == request.auth.uid`, `status == 'BOOKED'`, and existing `/doctors/{doctorId}` + `/clinics/{clinicId}`.
  - Patients can ONLY read/list their own `/appointments` and can ONLY transition `BOOKED -> CANCELLED` (atomically freeing `/slotLocks/{slotLockId}` via `getAfter`).
  - Clinic Admins (`role == 'CLINIC_ADMIN' && isActive == true`) can ONLY read/update appointments and slotLocks matching their assigned `clinicId` (strict clinic isolation).
  - Terminal appointment states (`COMPLETED`, `CANCELLED`, `NO_SHOW`) are locked against non-admin mutations (`status == 'BOOKED'` / `'CHECKED_IN'` / `'IN_PROGRESS'` checks, with `|| isSuperAdmin()` override).
- **Immutable Audit Trail (`/auditLogs/{logId}`)**: Append-only for Super Admin actions and verified signup/audit events referencing `request.auth.uid`; updates and deletes are unconditionally denied (`if false`).
- **Temporal Integrity**: All `createdAt` fields MUST equal `request.time` on creation and remain immutable on update; all `updatedAt` fields MUST equal `request.time` on create and update.

---

## 2. The "Dirty Dozen" Attack Payloads (Must All Fail With `PERMISSION_DENIED`)

1. **Privilege Escalation on Signup (`/users/{attackerUid}`)**: Patient sets `role: "SUPER_ADMIN"` when creating their own user doc.
2. **Self-Unban / Role Tamper on Update (`/users/{victimUid}`)**: Suspended user updates `isActive: true` or `role: "CLINIC_ADMIN"` on their own profile.
3. **Unverified Email Spoofing**: Request claiming admin email `'kingalone2345@gmail.com'` with `email_verified: false`.
4. **Ghost / Shadow Field Injection (`/clinics/{clinicId}` or `/doctors/{doctorId}`)**: Payload includes undeclared field `shadowFlag: true`.
5. **ID Poisoning / Path Traversal (`/doctors/{maliciousId}`)**: Document ID exceeds 128 chars or contains invalid characters (`"../../etc/passwd"` or 200-char string).
6. **Oversized String / Denial-of-Wallet (`/doctors/{doctorId}`)**: `photoUrl` > 250,000 chars or `bio` > 500 chars.
7. **Orphaned Appointment (`/appointments/{apptId}`)**: Booking references a nonexistent `doctorId` or spoofed `patientId != request.auth.uid`.
8. **Slot-Lock Bypass (`/appointments/{apptId}`)**: Creating an appointment directly without atomically writing the linked `/slotLocks/{slotLockId}` document (`existsAfter` / `getAfter` failure).
9. **Unauthorized Slot Theft (`/slotLocks/{slotLockId}`)**: Patient B tries to cancel or overwrite Patient A's `BOOKED` slot lock.
10. **Cross-Clinic Data Breach (`/appointments/{otherClinicApptId}`)**: `CLINIC_ADMIN` of Clinic A tries to read or update `status` on an appointment belonging to Clinic B (`clinicId != admin.clinicId`).
11. **Terminal State Mutation (`/appointments/{completedApptId}`)**: Non-super-admin attempts to update an appointment whose status is already `COMPLETED` or `CANCELLED`.
12. **PII Blanket Listing (`/users` or `/appointments`)**: Regular patient attempts `list` across `/users` or unfiltered `/appointments` without `patientId == request.auth.uid`.
