import { tenantRoute } from "@server/core/http/handler";
import { roleService } from "@server/modules/access";

export const GET = tenantRoute(async ({ ctx }) => roleService.listPermissions(ctx));
