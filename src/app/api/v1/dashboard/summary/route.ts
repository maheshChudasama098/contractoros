import { tenantRoute } from "@server/core/http/handler";
import { dashboardService } from "@server/modules/reporting";

export const GET = tenantRoute(async ({ ctx }) => dashboardService.summary(ctx));
