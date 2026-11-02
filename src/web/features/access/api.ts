import { api, ApiClientError } from "@web/lib/api-client";
import type {
  CreateMemberInput,
  InvitationWithLink,
  CreateRoleInput,
  MemberDto,
  PermissionDto,
  RoleDto,
  UpdateMemberInput,
  UpdateRoleInput,
} from "@shared/contracts/access";

const json = (method: string, body?: unknown) => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

// DELETE returns 204 with no body, so it can't go through `api()` (which parses JSON).
async function del(path: string) {
  const res = await fetch(`/api/v1${path}`, { method: "DELETE", credentials: "same-origin" });
  if (!res.ok) throw new ApiClientError(res.status, (await res.json()).error);
}

export const accessApi = {
  permissions: () => api<PermissionDto[]>("/permissions"),

  roles: () => api<RoleDto[]>("/roles"),
  role: (id: string) => api<RoleDto>(`/roles/${id}`),
  createRole: (input: CreateRoleInput) => api<RoleDto>("/roles", json("POST", input)),
  updateRole: (id: string, input: UpdateRoleInput) => api<RoleDto>(`/roles/${id}`, json("PATCH", input)),
  deleteRole: (id: string) => del(`/roles/${id}`),

  users: () => api<MemberDto[]>("/users"),
  createUser: (input: CreateMemberInput) => api<MemberDto>("/users", json("POST", input)),
  updateUser: (id: string, input: UpdateMemberInput) => api<MemberDto>(`/users/${id}`, json("PATCH", input)),
  deleteUser: (id: string) => del(`/users/${id}`),

  /** New invite link for an "Invited" user (replaces any earlier link). */
  inviteUser: (id: string) => api<InvitationWithLink>(`/users/${id}/invite`, json("POST", {})),
};

/** Applies server field errors to a Formik form; returns the general message otherwise. */
export function applyApiError(err: unknown, setFieldError: (field: string, msg: string) => void): string | null {
  if (err instanceof ApiClientError) {
    const fe = err.body.field_errors;
    if (fe && Object.keys(fe).length) {
      for (const [k, v] of Object.entries(fe)) if (v[0]) setFieldError(k, v[0]);
      return null;
    }
    return err.body.message;
  }
  return "Something went wrong. Try again.";
}
