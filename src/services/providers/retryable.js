// Temporary error na true (retry), permanent na false.
// HTTP status illa na (network/timeout error) retry pannalaam.

export const twilioRetryable = (err) => {
  const status = err.status;
  if (!status) return true;
  return status === 429 || status >= 500;
};

export const sendgridRetryable = (err) => {
  const status = err.response?.statusCode ?? (typeof err.code === "number" ? err.code : undefined);
  if (!status) return true;
  return status === 429 || status >= 500;
};