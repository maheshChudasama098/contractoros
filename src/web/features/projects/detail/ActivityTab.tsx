"use client";

import ForumOutlined from "@mui/icons-material/ForumOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, InitialsAvatar, Muted, SectionCard } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";
import type { ActivityDto } from "@shared/contracts/project-detail";
import { type ProjectDetailApi } from "./api";

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
};

export function ActivityTab({ api }: { api: ProjectDetailApi }) {
  const [items, setItems] = useState<ActivityDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => void api.activity().then(setItems).catch((e: Error) => setError(e.message)), [api]);

  // Group consecutive entries by calendar day.
  const groups = useMemo(() => {
    const out: { day: string; rows: ActivityDto[] }[] = [];
    for (const a of items ?? []) {
      const day = dayLabel(a.created_at);
      if (out.at(-1)?.day === day) out.at(-1)!.rows.push(a);
      else out.push({ day, rows: [a] });
    }
    return out;
  }, [items]);

  return (
    <>
      {error && <Alert severity="error">{error}</Alert>}
      <SectionCard title="Activity" bodySx={{ px: 2.5, py: items?.length ? 1 : 0 }}>
        {items && items.length === 0 ? (
          <EmptyState icon={<ForumOutlined />} title="No activity yet" />
        ) : (
          groups.map((g) => (
            <Box key={g.day} sx={{ py: 1 }}>
              <Box sx={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em", color: "text.secondary", mb: 1 }}>{g.day}</Box>
              {g.rows.map((a) => (
                <Stack key={a.id} direction="row" gap={1.5} alignItems="flex-start" sx={{ py: 1, borderBottom: `1px solid ${tokens.rowDivider}`, "&:last-of-type": { borderBottom: 0 } }}>
                  <InitialsAvatar name={a.actor ?? "System"} size={28} />
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ fontSize: 13.5 }}>
                      <strong>{a.actor ?? "System"}</strong> {a.summary.charAt(0).toLowerCase() + a.summary.slice(1)}
                    </Box>
                    <Muted sx={{ fontSize: 12 }}>{new Date(a.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</Muted>
                  </Stack>
                </Stack>
              ))}
            </Box>
          ))
        )}
      </SectionCard>
    </>
  );
}
