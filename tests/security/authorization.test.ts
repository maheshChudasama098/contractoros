import { describe, expect, it } from "vitest";
import { authorize } from "@server/core/authorization/policy";
import { AppError } from "@server/core/http/errors";
import type { TenantContext } from "@server/core/tenancy/context";

const ctx = (perms: string[]): TenantContext =>
  ({ userId: "u", organizationId: "o", membershipId: "m", requestId: "r", permissions: new Set(perms) }) as TenantContext;

describe("authorize", () => {
  it("denies missing permission with 403", () => {
    expect(() => authorize(ctx([]), "lead.write")).toThrowError(AppError);
  });
  it("allows granted permission", () => {
    expect(() => authorize(ctx(["lead.write"]), "lead.write")).not.toThrow();
  });
});
