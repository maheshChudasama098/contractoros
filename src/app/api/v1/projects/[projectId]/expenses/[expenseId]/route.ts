import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { expenseService } from "@server/modules/projects";
import { ExpenseInput } from "@shared/contracts/project-detail";

type P = { projectId: string; expenseId: string };

export const PUT = tenantRoute<P>(async ({ req, ctx, params }) =>
  expenseService.update(ctx, params.projectId, params.expenseId, await parseBody(req, ExpenseInput)),
);

export const DELETE = tenantRoute<P>(async ({ ctx, params }) => {
  await expenseService.remove(ctx, params.projectId, params.expenseId);
  return new NextResponse(null, { status: 204 });
});
