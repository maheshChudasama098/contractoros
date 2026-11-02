"use client";

import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import type { LeadDto } from "@shared/contracts/leads";
import { leadsApi } from "../api";

export function LeadList() {
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    leadsApi.list().then((r) => setLeads(r.items)).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <Typography color="error">{error}</Typography>;
  if (leads.length === 0) return <Typography color="text.secondary">No leads yet.</Typography>;

  return (
    <Card component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
      {leads.map((l) => (
        <Stack component="li" key={l.id} direction="row" justifyContent="space-between" sx={{ p: 1.5, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
          <span>{l.company_name ?? [l.first_name, l.last_name].filter(Boolean).join(" ")}</span>
          <Typography variant="body2" color="text.secondary">{l.stage}</Typography>
        </Stack>
      ))}
    </Card>
  );
}
