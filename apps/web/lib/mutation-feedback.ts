import { toast } from "sonner";

type BackgroundSaveOptions<T> = {
  loadingMessage: string;
  successMessage: string;
  errorMessage: string;
  action: () => Promise<T>;
  onSuccess?: (result: T) => Promise<void> | void;
  onError?: (error: unknown) => Promise<void> | void;
};

export function getMutationErrorMessage(error: unknown, fallback: string): string {
  const responseMessage = (
    error as { response?: { data?: { message?: string | string[] } } }
  )?.response?.data?.message;

  if (Array.isArray(responseMessage)) {
    const joinedMessage = responseMessage.filter(Boolean).join(", ").trim();
    if (joinedMessage) return joinedMessage;
  }

  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  return (error as Error)?.message ?? fallback;
}

export function runBackgroundSave<T>({
  loadingMessage,
  successMessage,
  errorMessage,
  action,
  onSuccess,
  onError,
}: BackgroundSaveOptions<T>) {
  const toastId = toast.loading(loadingMessage);

  void (async () => {
    try {
      const result = await action();
      await onSuccess?.(result);
      toast.success(successMessage, { id: toastId });
    } catch (error) {
      await onError?.(error);
      toast.error(getMutationErrorMessage(error, errorMessage), { id: toastId });
    }
  })();
}
