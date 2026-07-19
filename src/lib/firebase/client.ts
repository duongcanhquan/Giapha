import {
  initializeApp,
  getApps,
  getApp,
  deleteApp,
  type FirebaseApp,
} from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig, isFirebaseConfigured } from "./config";

export { isFirebaseConfigured } from "./config";

function assertConfig() {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase chưa được cấu hình. Thêm NEXT_PUBLIC_FIREBASE_* vào .env.local.",
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  assertConfig();
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/**
 * Tạo / xác thực user Auth mà không đổi phiên đăng nhập hiện tại (chủ họ).
 * Dùng secondary Firebase App.
 */
export async function provisionAuthUser(
  email: string,
  password: string,
): Promise<{ uid: string; created: boolean }> {
  assertConfig();
  const name = `Secondary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const secondary = initializeApp(firebaseConfig, name);
  const auth = getAuth(secondary);
  try {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await signOut(auth);
      return { uid: cred.user.uid, created: true };
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      if (code !== "auth/email-already-in-use") {
        throw err;
      }
      // Email đã có — đăng nhập phụ với mật khẩu chủ cung cấp để lấy uid
      try {
        const existing = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const uid = existing.user.uid;
        await signOut(auth);
        return { uid, created: false };
      } catch {
        throw new Error(
          "Email này đã có tài khoản nhưng mật khẩu không khớp. Nhập đúng mật khẩu hiện tại của họ để giao thêm nhánh, hoặc họ đổi mật khẩu rồi thử lại.",
        );
      }
    }
  } finally {
    await deleteApp(secondary).catch(() => undefined);
  }
}
