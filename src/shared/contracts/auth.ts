import { z } from "zod";

// Auth request/response contracts shared by /api/v1/auth/* and the web forms.
const email = z.string().trim().toLowerCase().email().max(254);
const newPassword = z.string().min(10, "Use at least 10 characters.").max(128);

export const LoginInput = z.object({
  email,
  password: z.string().min(1).max(128),
  remember: z.boolean().default(false),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const SignupInput = z.object({
  name: z.string().trim().min(1, "Your name is required.").max(160),
  company: z.string().trim().min(1, "Company name is required.").max(160),
  email,
  password: newPassword,
});
export type SignupInput = z.infer<typeof SignupInput>;

export const ForgotPasswordInput = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInput>;

export const VerifyOtpInput = z.object({ email, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code.") });
export type VerifyOtpInput = z.infer<typeof VerifyOtpInput>;

export const ResetPasswordInput = z.object({ resetToken: z.string().min(20).max(200), password: newPassword });
export type ResetPasswordInput = z.infer<typeof ResetPasswordInput>;

export const ChangePasswordInput = z
  .object({ currentPassword: z.string().min(1).max(128), newPassword })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "Choose a password you haven't used here.",
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  activeOrganizationId: string | null;
  passwordChangedAt: string | null;
};

export type VerifyOtpResult = { resetToken: string };
