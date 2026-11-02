import { NextResponse } from "next/server";
import { parseBody, tenantRoute } from "@server/core/http/handler";
import { expenseService } from "@server/modules/projects";
import { ExpenseInput } from "@shared/contracts/project-detail";

type P = { projectId: string };

export const GET = tenantRoute<P>(async ({ ctx, params }) => expenseService.list(ctx, params.projectId));

export const POST = tenantRoute<P>(async ({ req, ctx, params }) => {
  const expense = await expenseService.create(ctx, params.projectId, await parseBody(req, ExpenseInput));
  return NextResponse.json({ data: expense }, { status: 201 });
});
