import { tenantRoute } from "@server/core/http/handler";
import { invitationService } from "@server/modules/access";

type P = { memberId: string };

// Sends a new invite link to a user added as "Invited" (each call replaces the previous link).
export const POST = tenantRoute<P>(async ({ ctx, params }) => invitationService.inviteMember(ctx, params.memberId));
