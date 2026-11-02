import { NextResponse } from "next/server";
import { Errors } from "@server/core/http/errors";
import { parseBody, sessionRoute } from "@server/core/http/handler";
import { masterService } from "@server/modules/masters";
import { MasterItemInput, MasterTypeParam } from "@shared/contracts/masters";

type P = { type: string };

const typeOf = (raw: string) => {
  const t = MasterTypeParam.safeParse(raw);
  if (!t.success) throw Errors.notFound("Master");
  return t.data;
};

// Super admin only (checked in the service).
export const GET = sessionRoute<P>(async ({ params, session }) => masterService.list(session, typeOf(params.type)));

export const POST = sessionRoute<P>(async ({ req, params, session }) => {
  const item = await masterService.create(session, typeOf(params.type), await parseBody(req, MasterItemInput));
  return NextResponse.json({ data: item }, { status: 201 });
});
