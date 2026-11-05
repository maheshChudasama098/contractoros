import { api } from "@web/lib/api-client";
import type { CalendarItemDto, CalendarQuery } from "@shared/contracts/calendar";

export const calendarApi = {
  list: (q: CalendarQuery) => {
    const params = new URLSearchParams(
      Object.entries(q).flatMap(([k, v]) => (v === undefined || v === "" ? [] : [[k, String(v)]])),
    );
    return api<CalendarItemDto[]>(`/calendar?${params}`);
  },
};
