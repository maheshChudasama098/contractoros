import { NextResponse } from "next/server";
import { publicRoute } from "@server/core/http/handler";
import { authService } from "@server/core/auth/auth.service";

export const POST = publicRoute(async () => {
  await authService.logout();
  return new NextResponse(null, { status: 204 });
});
