"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { OperationType, clampString, firestore, getFirebaseApp, handleFirestoreError, optionalString } from "@/lib/firebase";

export async function signInWithGoogle() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export async function signInWithEmailPassword(email: string, password: string) {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export async function registerPatientWithEmailPassword(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const email = input.email.trim().toLowerCase();
  const result = await createUserWithEmailAndPassword(auth, email, input.password);
  const safeName = clampString(input.name, 80, 2);

  await updateProfile(result.user, { displayName: safeName }).catch(() => {});

  if (result.user.emailVerified) {
    try {
      await setDoc(doc(firestore, "users", result.user.uid), {
        uid: result.user.uid,
        name: safeName,
        email,
        phone: optionalString(input.phone, 30),
        role: "PATIENT",
        clinicId: null,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${result.user.uid}`);
    }
  }

  const idToken = await result.user.getIdToken();
  return { user: result.user, idToken };
}

export function friendlyFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err ? String((err as { code?: unknown }).code) : "";
  const msg = err instanceof Error ? err.message : "";

  if (code === "auth/popup-closed-by-user") {
    return "Google sign-in was cancelled.";
  }
  if (code === "auth/popup-blocked") {
    return "Popup was blocked by your browser. Allow popups for this site and try again.";
  }
  if (code === "auth/operation-not-allowed" || msg.includes("PASSWORD_LOGIN_DISABLED")) {
    return "Email/Password sign-in is not enabled in Firebase Console yet. Please use Continue with Google above, or enable Email/Password under Firebase Console → Authentication → Sign-in method.";
  }
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
    return "Invalid email or password.";
  }
  if (code === "auth/email-already-in-use") {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (code === "auth/weak-password") {
    return "Password must be at least 6–8 characters.";
  }
  return "Authentication failed. Please try again with Google.";
}
