import { api, ApiClientError } from "@web/lib/api-client";
import type { MasterItemDto, MasterItemInput, MasterType, UpdateMasterItemInput } from "@shared/contracts/masters";

const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

export const mastersApi = {
  list: (type: MasterType) => api<MasterItemDto[]>(`/admin/masters/${type}`),
  create: (type: MasterType, input: MasterItemInput) => api<MasterItemDto>(`/admin/masters/${type}`, json("POST", input)),
  update: (type: MasterType, id: string, input: UpdateMasterItemInput) =>
    api<MasterItemDto>(`/admin/masters/${type}/${id}`, json("PATCH", input)),
  // DELETE returns 204 with no body, so it can't go through `api()` (which parses JSON).
  async remove(type: MasterType, id: string) {
    const res = await fetch(`/api/v1/admin/masters/${type}/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) throw new ApiClientError(res.status, (await res.json()).error);
  },
};
