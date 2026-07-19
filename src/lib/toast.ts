import { toast } from "sonner";

/** Global Toast Service (sonner) — thông báo tức thời cho Admin */
export const appToast = {
  success(message: string, description?: string) {
    toast.success(message, { description });
  },
  error(message: string, description?: string) {
    toast.error(message, { description });
  },
  info(message: string, description?: string) {
    toast.message(message, { description });
  },
  promise<T>(
    promise: Promise<T>,
    labels: { loading: string; success: string; error: string },
  ) {
    return toast.promise(promise, labels);
  },
};
