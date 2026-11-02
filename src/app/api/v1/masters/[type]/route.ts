import { Errors } from "@server/core/http/errors";
import { sessionRoute } from "@server/core/http/handler";
import { masterService } from "@server/modules/masters";
import { MasterTypeParam } from "@shared/contracts/masters";

type P = { type: string };

// Active options for menus (any signed-in user).
export const GET = sessionRoute<P>(async ({ params }) => {
  const type = MasterTypeParam.safeParse(params.type);
  if (!type.success) throw Errors.notFound("Master");
  return masterService.options(type.data);
});
