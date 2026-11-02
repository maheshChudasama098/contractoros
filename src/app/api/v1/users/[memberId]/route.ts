import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { memberService } from "@server/modules/access";
import { UpdateMemberInput } from "@shared/contracts/access";

type P = { memberId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => memberService.get(ctx, params.memberId));

export const PATCH = tenantRoute<P>(async ({ req, ctx, params }) =>
  memberService.update(ctx, params.memberId, await parseBody(req, UpdateMemberInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await memberService.remove(ctx, params.memberId);
  return new NextResponse(null, { status: 204 });
});
