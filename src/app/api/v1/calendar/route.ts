import { parseQuery, tenantRoute } from "@server/core/http/handler";
import { calendarService } from "@server/modules/calendar";
import { CalendarQuery } from "@shared/contracts/calendar";

export const GET = tenantRoute(async ({ req, ctx }) => calendarService.list(ctx, parseQuery(req, CalendarQuery)));
