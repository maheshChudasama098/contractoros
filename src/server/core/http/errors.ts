// Domain/application errors. Route handlers map these to the API error envelope.
export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly fieldErrors?: FieldErrors,
  ) {
    super(message);
  }
}

export const Errors = {
  unauthenticated: () => new AppError("unauthenticated", "Authentication required", 401),
  forbidden: () => new AppError("forbidden", "You do not have permission", 403),
  // Non-disclosing: use for cross-tenant lookups so existence is not leaked.
  notFound: (what = "Resource") => new AppError("not_found", `${what} not found`, 404),
  conflict: (message: string) => new AppError("conflict", message, 409),
  validation: (fieldErrors: FieldErrors) =>
    new AppError("validation_error", "Validation failed", 422, fieldErrors),
  rateLimited: () => new AppError("rate_limited", "Too many requests", 429),
};
