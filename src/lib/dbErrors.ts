export function isDatabaseConnectionError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message || "").toLowerCase();

  return (
    message.includes("failed to connect to upstream database") ||
    message.includes("connection terminated") ||
    message.includes("connection closed") ||
    message.includes("econnrefused") ||
    message.includes("connection refused") ||
    message.includes("timeout") ||
    message.includes("p1017") ||
    message.includes("p1001")
  );
}
