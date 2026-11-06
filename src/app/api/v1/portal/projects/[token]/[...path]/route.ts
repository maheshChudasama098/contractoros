import { fileResponse } from "@server/core/http/file-response";
import { Errors } from "@server/core/http/errors";
import { parseBody, publicRoute } from "@server/core/http/handler";
import { RATE_LIMITS } from "@server/core/rate-limit/rate-limit";
import { shareService } from "@server/modules/projects";
import { SharedTaskInput } from "@shared/contracts/project-share";

type P = { token: string; path: string[] };
type FileResult = { file: { body: Buffer; mimeType: string; filename: string }; inline: boolean };
const isFile = (v: unknown): v is FileResult => !!v && typeof v === "object" && "file" in v;

/** Every project tab, read-only: /portal/projects/{token}/{overview|tasks|events|expenses|files|…}. */
export const GET = publicRoute<P>(
  async ({ req, params }) => {
    const out = await shareService.read(params.token, params.path, req.nextUrl.searchParams);
    return isFile(out) ? fileResponse(out.file.body, out.file.mimeType, out.file.filename, out.inline) : out;
  },
  { rateLimit: RATE_LIMITS.portal },
);

/** Only tasks can be added (POST tasks). */
export const POST = publicRoute<P>(
  async ({ req, params }) => {
    if (params.path.join("/") !== "tasks") throw Errors.forbidden();
    return shareService.createTask(params.token, await parseBody(req, SharedTaskInput));
  },
  { rateLimit: RATE_LIMITS.portal },
);

/** Only tasks can be updated (PUT tasks/{id}). Nothing can be deleted. */
export const PUT = publicRoute<P>(
  async ({ req, params }) => {
    const [section, id, extra] = params.path;
    if (section !== "tasks" || !id || extra) throw Errors.forbidden();
    return shareService.updateTask(params.token, id, await parseBody(req, SharedTaskInput));
  },
  { rateLimit: RATE_LIMITS.portal },
);
