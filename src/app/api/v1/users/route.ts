import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { memberService } from "@server/modules/access";
import { CreateMemberInput } from "@shared/contracts/access";

export const GET = tenantRoute(async ({ ctx }) => memberService.list(ctx));

export const POST = tenantRoute(async ({ req, ctx }) => {
  const member = await memberService.create(ctx, await parseBody(req, CreateMemberInput));
  return NextResponse.json({ data: member }, { status: 201 });
});
