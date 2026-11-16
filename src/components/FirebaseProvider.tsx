"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User as FirebaseUser } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  BOOTSTRAP_ADMIN_EMAIL,
  OperationType,
  clampString,
  firestore,
  getClientAuth,
  handleFirestoreError,
  testConnection,
} from "@/lib/firebase";
import { STARTER_CATALOG } from "@/lib/starter-catalog";

export type UserRole = "PATIENT" | "CLINIC_ADMIN" | "SUPER_ADMIN";

export type AppUserProfile = {
  uid: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  clinicId: string | null;
  inviteId?: string | null;
  isActive: boolean;
};

type FirebaseContextValue = {
  ready: boolean;
  firebaseUser: FirebaseUser | null;
  profile: AppUserProfile | null;
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const FirebaseContext = createContext<FirebaseContextValue>({
  ready: false,
  firebaseUser: null,
  profile: null,
  profileError: null,
  refreshProfile: async () => {},
  signOutUser: async () => {},
});

export function useFirebase() {
  return useContext(FirebaseContext);
}

export async function seedStarterCatalogToFirestore(): Promise<{ seeded: boolean; counts: { clinics: number; doctors: number } }> {
  const existingClinics = await getDocs(query(collection(firestore, "clinics"), limit(1))).catch((err) =>
    handleFirestoreError(err, OperationType.LIST, "clinics"),
  );
  if (!existingClinics.empty) {
    return { seeded: false, counts: { clinics: 0, doctors: 0 } };
  }

  const clinicById = new Map(STARTER_CATALOG.clinics.map((c) => [c.id, c]));
  const specById = new Map(STARTER_CATALOG.specialties.map((s) => [s.id, s]));

  const batch = writeBatch(firestore);
  const now = serverTimestamp();

  for (const c of STARTER_CATALOG.clinics) {
    batch.set(doc(firestore, "clinics", c.id), {
      name: clampString(c.name, 120, 2),
      address: clampString(c.address, 200, 3),
      city: clampString(c.city, 80, 2),
      phone: c.phone,
      openTime: c.openTime,
      closeTime: c.closeTime,
      isActive: c.isActive,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const s of STARTER_CATALOG.specialties) {
    batch.set(doc(firestore, "specialties", s.id), {
      name: clampString(s.name, 80, 2),
    });
  }

  for (const d of STARTER_CATALOG.doctors) {
    const clinic = clinicById.get(d.clinicId);
    const spec = specById.get(d.specialtyId);
    batch.set(doc(firestore, "doctors", d.id), {
      clinicId: d.clinicId,
      specialtyId: d.specialtyId,
      clinicName: clinic ? clampString(clinic.name, 120, 2) : null,
      clinicCity: clinic ? clampString(clinic.city, 80, 2) : null,
      specialtyName: spec ? clampString(spec.name, 80, 2) : null,
      name: clampString(d.name, 100, 2),
      qualifications: d.qualifications,
      bio: d.bio,
      photoUrl: null,
      consultationFee: d.consultationFee,
      avgConsultMinutes: d.avgConsultMinutes,
      isActive: d.isActive,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const sc of STARTER_CATALOG.doctorSchedules) {
    batch.set(doc(firestore, "doctorSchedules", sc.id), {
      doctorId: sc.doctorId,
      weekday: sc.weekday,
      startTime: sc.startTime,
      endTime: sc.endTime,
      slotMinutes: sc.slotMinutes,
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, "clinics,specialties,doctors,doctorSchedules");
  }

  return {
    seeded: true,
    counts: { clinics: STARTER_CATALOG.clinics.length, doctors: STARTER_CATALOG.doctors.length },
  };
}

async function ensureUserProfileAndSync(fbUser: FirebaseUser): Promise<AppUserProfile> {
  const email = (fbUser.email ?? "").trim().toLowerCase();
  const displayName = clampString(fbUser.displayName || email.split("@")[0] || "Dakterly User", 80, 2);
  const isBootstrap = email === BOOTSTRAP_ADMIN_EMAIL && fbUser.emailVerified;

  const userRef = doc(firestore, "users", fbUser.uid);
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
  }

  if (snap.exists()) {
    const d = snap.data() as Record<string, unknown>;
    const effectiveRole: UserRole = isBootstrap
      ? "SUPER_ADMIN"
      : d.role === "SUPER_ADMIN" || d.role === "CLINIC_ADMIN" || d.role === "PATIENT"
        ? d.role
        : "PATIENT";

    if (isBootstrap) {
      // Ensure admin registry & starter catalog are populated
      const adminRef = doc(firestore, "admins", fbUser.uid);
      const adminSnap = await getDoc(adminRef).catch(() => null);
      if (adminSnap && !adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: fbUser.uid,
          email,
          role: "SUPER_ADMIN",
          createdAt: serverTimestamp(),
        }).catch((err) => handleFirestoreError(err, OperationType.CREATE, `admins/${fbUser.uid}`));
      }
      if (d.role !== "SUPER_ADMIN") {
        await updateDoc(userRef, {
          role: "SUPER_ADMIN",
          isActive: true,
          updatedAt: serverTimestamp(),
        }).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${fbUser.uid}`));
      }
      await seedStarterCatalogToFirestore().catch(() => {});
    }

    return {
      uid: fbUser.uid,
      name: String(d.name ?? displayName),
      email: String(d.email ?? email),
      phone: typeof d.phone === "string" ? d.phone : null,
      role: effectiveRole,
      clinicId: typeof d.clinicId === "string" ? d.clinicId : null,
      inviteId: typeof d.inviteId === "string" ? d.inviteId : null,
      isActive: Boolean(d.isActive ?? true),
    };
  }

  // First-time sign-in for this Firebase Auth UID
  if (isBootstrap) {
    try {
      await setDoc(doc(firestore, "admins", fbUser.uid), {
        uid: fbUser.uid,
        email,
        role: "SUPER_ADMIN",
        createdAt: serverTimestamp(),
      });
      await setDoc(userRef, {
        uid: fbUser.uid,
        name: displayName,
        email,
        phone: null,
        role: "SUPER_ADMIN",
        clinicId: null,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
    }

    await seedStarterCatalogToFirestore().catch(() => {});
    return {
      uid: fbUser.uid,
      name: displayName,
      email,
      phone: null,
      role: "SUPER_ADMIN",
      clinicId: null,
      isActive: true,
    };
  }

  // Check if a Super Admin invited this email as a Clinic Admin
  let matchedInvite: { id: string; name: string; clinicId: string; phone: string | null } | null = null;
  try {
    const inviteQ = query(collection(firestore, "clinicInvites"), where("email", "==", email));
    const inviteSnaps = await getDocs(inviteQ);
    for (const invDoc of inviteSnaps.docs) {
      const inv = invDoc.data() as Record<string, unknown>;
      if (inv.isActive === true && typeof inv.clinicId === "string") {
        matchedInvite = {
          id: invDoc.id,
          name: typeof inv.name === "string" ? inv.name : displayName,
          clinicId: inv.clinicId,
          phone: typeof inv.phone === "string" ? inv.phone : null,
        };
        break;
      }
    }
  } catch {
    // No active clinic invite found
  }

  if (matchedInvite) {
    try {
      await setDoc(userRef, {
        uid: fbUser.uid,
        name: clampString(matchedInvite.name, 80, 2),
        email,
        phone: matchedInvite.phone,
        role: "CLINIC_ADMIN",
        clinicId: matchedInvite.clinicId,
        inviteId: matchedInvite.id,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(firestore, "clinicInvites", matchedInvite.id), {
        claimedUid: fbUser.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
    }

    return {
      uid: fbUser.uid,
      name: matchedInvite.name,
      email,
      phone: matchedInvite.phone,
      role: "CLINIC_ADMIN",
      clinicId: matchedInvite.clinicId,
      inviteId: matchedInvite.id,
      isActive: true,
    };
  }

  // Standard patient self-registration
  try {
    await setDoc(userRef, {
      uid: fbUser.uid,
      name: displayName,
      email,
      phone: null,
      role: "PATIENT",
      clinicId: null,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
  }

  return {
    uid: fbUser.uid,
    name: displayName,
    email,
    phone: null,
    role: "PATIENT",
    clinicId: null,
    isActive: true,
  };
}

export default function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadUser = useCallback(async (fbUser: FirebaseUser | null) => {
    setFirebaseUser(fbUser);
    setProfileError(null);
    if (!fbUser) {
      setProfile(null);
      setReady(true);
      return;
    }

    try {
      const p = await ensureUserProfileAndSync(fbUser);
      setProfile(p);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not load user profile from Firestore.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void testConnection();
    const auth = getClientAuth();
    if (!auth) {
      setReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      void loadUser(fbUser);
    });
    return () => unsubscribe();
  }, [loadUser]);

  const refreshProfile = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth?.currentUser) return;
    await loadUser(auth.currentUser);
  }, [loadUser]);

  const signOutUser = useCallback(async () => {
    const auth = getClientAuth();
    if (auth) {
      await fbSignOut(auth).catch(() => {});
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setFirebaseUser(null);
    setProfile(null);
  }, []);

  return (
    <FirebaseContext.Provider
      value={{ ready, firebaseUser, profile, profileError, refreshProfile, signOutUser }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}
