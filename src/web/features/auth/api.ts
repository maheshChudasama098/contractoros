import { ApiClientError, api } from "@web/lib/api-client";
import type {
  AuthUser,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  VerifyOtpInput,
  VerifyOtpResult,
} from "@shared/contracts/auth";

const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const authApi = {
  login: (input: LoginInput) => post<AuthUser>("/auth/login", input),
  signup: (input: SignupInput) => post<AuthUser>("/auth/signup", input),
  logout: () => fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" }),
  me: () => api<AuthUser>("/auth/me"),
  forgotPassword: (input: ForgotPasswordInput) => post<{ sent: true }>("/auth/forgot-password", input),
  verifyOtp: (input: VerifyOtpInput) => post<VerifyOtpResult>("/auth/verify-otp", input),
  resetPassword: (input: ResetPasswordInput) => post<{ reset: true }>("/auth/reset-password", input),
  changePassword: (input: ChangePasswordInput) => post<{ changed: true }>("/auth/change-password", input),
};

/** Human message for a failed auth call (field errors are mapped onto forms separately). */
export function authErrorMessage(err: unknown): string {
  if (!(err instanceof ApiClientError)) return "Something went wrong. Please try again.";
  if (err.status === 429) return "Too many attempts. Please wait 15 minutes and try again.";
  return err.body.message;
}

// Hand-off between the forgot → verify → reset steps. Session storage keeps the reset token out of URLs.
export const RESET_EMAIL_KEY = "cos.reset.email";
export const RESET_TOKEN_KEY = "cos.reset.token";
