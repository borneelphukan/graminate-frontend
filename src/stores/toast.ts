import { writable } from "svelte/store";

type ToastType = "success" | "error";

export const toastMessage = writable<{
  message: string;
  type: ToastType;
} | null>(null);
export const showToast = writable<boolean>(false);

export function triggerToast(
  message: string,
  type: ToastType = "success",
  duration = 3000
) {
  toastMessage.set({ message, type });
  showToast.set(true);

  setTimeout(() => {
    showToast.set(false);
    toastMessage.set(null);
  }, duration);
}
