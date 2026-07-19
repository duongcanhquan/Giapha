import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { mapFirebaseAuthError } from "@/lib/firebase/auth-errors";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export type RegisterInput = {
  email: string;
  password: string;
  displayName?: string;
};

export async function registerWithEmail(input: RegisterInput): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase chưa cấu hình — thêm đủ NEXT_PUBLIC_FIREBASE_* (apiKey, authDomain, projectId, appId).",
    );
  }
  try {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(
      auth,
      input.email.trim(),
      input.password,
    );
    if (input.displayName?.trim()) {
      await updateProfile(cred.user, { displayName: input.displayName.trim() });
    }
    return cred.user;
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase chưa cấu hình — thêm đủ NEXT_PUBLIC_FIREBASE_* (apiKey, authDomain, projectId, appId).",
    );
  }
  try {
    const auth = getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err));
  }
}

export async function signOutUser(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  await signOut(getFirebaseAuth());
}

export function getCurrentUser(): User | null {
  if (!isFirebaseConfigured()) return null;
  return getFirebaseAuth().currentUser;
}

/**
 * Subscribe auth. Nếu Firebase chưa cấu hình → gọi callback(null) một lần.
 */
export function subscribeAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(getFirebaseAuth(), callback);
}
