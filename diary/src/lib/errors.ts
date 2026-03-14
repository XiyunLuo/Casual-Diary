export function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === "object" && err !== null) {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  return fallback;
}
