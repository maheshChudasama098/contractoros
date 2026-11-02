import { z } from "zod";
import { authRoute, parseBody, parseQuery } from "@server/core/http/handler";
import { invitationService } from "@server/modules/access";
import { AcceptInvitationInput } from "@shared/contracts/access";

// Public: the invite token is the credential. Strict per-IP limit (token guessing / password checks).
export const GET = authRoute(async ({ req }) =>
  invitationService.preview(parseQuery(req, z.object({ token: z.string().min(20).max(200) })).token),
);

export const POST = authRoute(async ({ req }) => invitationService.accept(await parseBody(req, AcceptInvitationInput)));
