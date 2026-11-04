import { api, ApiClientError } from "@web/lib/api-client";
import type { ListPage } from "@shared/contracts/api";
import type { CustomerDto, CustomerInput, CustomerListQuery, CustomerTab } from "@shared/contracts/customers";

const json = (method: string, body: unknown) => ({ method, body: JSON.stringify(body) });

export const customersApi = {
  list: (q: CustomerListQuery) => {
    const params = new URLSearchParams(
      Object.entries(q).flatMap(([k, val]) => (val === undefined || val === "" ? [] : [[k, String(val)]])),
    );
    return api<ListPage<CustomerDto, CustomerTab>>(`/customers?${params}`);
  },
  cities: () => api<string[]>("/customers/cities"),
  create: (input: CustomerInput) => api<CustomerDto>("/customers", json("POST", input)),
  update: (id: string, input: CustomerInput) => api<CustomerDto>(`/customers/${id}`, json("PUT", input)),
  // DELETE returns 204 with no body, so it can't go through `api()` (which parses JSON).
  async remove(id: string) {
    const res = await fetch(`/api/v1/customers/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) throw new ApiClientError(res.status, (await res.json()).error);
  },
};

/** Applies server field errors to a Formik form; returns the general message otherwise. */
export function applyApiError(err: unknown, setFieldError: (field: string, msg: string) => void): string | null {
  if (err instanceof ApiClientError) {
    const fe = err.body.field_errors;
    if (fe && Object.keys(fe).length) {
      for (const [k, m] of Object.entries(fe)) if (m[0]) setFieldError(k, m[0]);
      return null;
    }
    return err.body.message;
  }
  return "Something went wrong. Try again.";
}
