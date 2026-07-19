/** Đổi mã lỗi Firebase Auth thành hướng dẫn tiếng Việt. */
export function mapFirebaseAuthError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const raw =
    err instanceof Error ? err.message : "Đăng nhập / đăng ký thất bại.";

  switch (code) {
    case "auth/configuration-not-found":
      return (
        "Firebase Authentication chưa được bật cho project này. " +
        "Vào Firebase Console → Build → Authentication → Get started, " +
        "bật Email/Password, rồi kiểm tra biến NEXT_PUBLIC_FIREBASE_* trên Vercel/.env.local."
      );
    case "auth/api-key-not-valid":
    case "auth/invalid-api-key":
      return "API key Firebase không hợp lệ. Kiểm tra NEXT_PUBLIC_FIREBASE_API_KEY.";
    case "auth/unauthorized-domain":
      return (
        "Domain hiện tại chưa được phép đăng nhập. " +
        "Thêm domain vào Firebase Console → Authentication → Settings → Authorized domains."
      );
    case "auth/email-already-in-use":
      return "Email đã có tài khoản. Hãy đăng nhập, hoặc gửi lại hồ sơ nếu bị từ chối.";
    case "auth/invalid-email":
      return "Email không hợp lệ.";
    case "auth/weak-password":
      return "Mật khẩu quá yếu (cần ít nhất 6 ký tự).";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email hoặc mật khẩu không đúng.";
    case "auth/too-many-requests":
      return "Thử quá nhiều lần. Vui lòng đợi rồi thử lại.";
    case "auth/network-request-failed":
      return "Lỗi mạng khi kết nối Firebase. Kiểm tra kết nối internet.";
    default:
      if (raw.includes("configuration-not-found")) {
        return (
          "Firebase Authentication chưa được bật cho project này. " +
          "Vào Firebase Console → Authentication → Get started → Email/Password."
        );
      }
      return raw;
  }
}
