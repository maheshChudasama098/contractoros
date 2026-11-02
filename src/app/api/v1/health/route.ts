import { publicRoute } from "@server/core/http/handler";

export const dynamic = "force-dynamic";

export const GET = publicRoute(async () => ({ status: "ok" }));
