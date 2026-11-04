import { tenantRoute } from "@server/core/http/handler";
import { customerService } from "@server/modules/customers";

// Distinct billing cities for the list's city filter.
export const GET = tenantRoute(async ({ ctx }) => customerService.cities(ctx));
