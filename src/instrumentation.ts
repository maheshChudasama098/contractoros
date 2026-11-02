import type { Instrumentation } from "next";

// Catches errors thrown outside API wrappers (server components, server actions, route render).
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { recordError } = await import("@server/core/logger/error-log.service");
  await recordError(err, {
    source: "server",
    metadata: { path: request.path, method: request.method, routePath: context.routePath, routeType: context.routeType },
  });
};
