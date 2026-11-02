import { api, ApiClientError } from "@web/lib/api-client";
import type { Paginated } from "@shared/contracts/api";
import type { ProjectDto, ProjectInput, ProjectListQuery } from "@shared/contracts/projects";

const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

export const projectsApi = {
  list: (q: ProjectListQuery) => {
    const params = new URLSearchParams(
      Object.entries(q).flatMap(([k, val]) => (val === undefined || val === "" ? [] : [[k, String(val)]])),
    );
    return api<Paginated<ProjectDto>>(`/projects?${params}`);
  },
  create: (input: ProjectInput) => api<ProjectDto>("/projects", json("POST", input)),
  update: (id: string, input: ProjectInput) => api<ProjectDto>(`/projects/${id}`, json("PUT", input)),
  // DELETE returns 204 with no body, so it can't go through `api()` (which parses JSON).
  async remove(id: string) {
    const res = await fetch(`/api/v1/projects/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) throw new ApiClientError(res.status, (await res.json()).error);
  },
};
