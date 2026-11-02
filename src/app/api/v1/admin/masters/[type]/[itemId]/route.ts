import { NextResponse } from "next/server";
import { Errors } from "@server/core/http/errors";
import { parseBody, sessionRoute } from "@server/core/http/handler";
import { masterService } from "@server/modules/masters";
import { MasterTypeParam, UpdateMasterItemInput } from "@shared/contracts/masters";

type P = { type: string; itemId: string };

const typeOf = (raw: string) => {
  const t = MasterTypeParam.safeParse(raw);
  if (!t.success) throw Errors.notFound("Master");
  return t.data;
};

// Super admin only (checked in the service).
export const PATCH = sessionRoute<P>(async ({ req, params, session }) =>
  masterService.update(session, typeOf(params.type), params.itemId, await parseBody(req, UpdateMasterItemInput)),
);

export const DELETE = sessionRoute<P>(async ({ params, session }) => {
  await masterService.remove(session, typeOf(params.type), params.itemId);
  return new NextResponse(null, { status: 204 });
});
