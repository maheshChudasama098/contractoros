"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { tokens } from "@web/theme/tokens";
import { searchIndex } from "@web/mocks/data";

const CHIPS = ["All", "Customers", "Projects", "Estimates", "Invoices", "Leads"] as const;
type Chip = (typeof CHIPS)[number];

const CREATE = [
  { label: "New lead", href: "/leads?new=1", keys: "N L" },
  { label: "New estimate", href: "/estimates/new", keys: "N E" },
  { label: "New invoice", href: "/invoices/new", keys: "N I" },
  { label: "New change order", href: "/change-orders?new=1", keys: "N C" },
  { label: "Assign work on the schedule", href: "/schedule" },
];
const GOTO = [
  { label: "Dashboard", href: "/dashboard", keys: "G D" },
  { label: "Projects", href: "/projects", keys: "G P" },
  { label: "Invoices & payments", href: "/invoices", keys: "G I" },
];

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <Box
    component="kbd"
    sx={{ typography: "num", fontSize: 11, px: "5px", py: "1px", border: `1px solid ${tokens.borderStrong}`, borderRadius: "4px", bgcolor: "#fff", color: "text.secondary" }}
  >
    {children}
  </Box>
);

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<Chip>("All");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return searchIndex.filter(
      (r) => (chip === "All" || r.kind + "s" === chip) && (!term || `${r.title} ${r.sub}`.toLowerCase().includes(term)),
    );
  }, [q, chip]);

  const showCreate = !q.trim() && chip === "All";
  const items = showCreate ? [...CREATE, ...results.slice(0, 4), ...GOTO] : results;

  useEffect(() => setActive(0), [q, chip]);
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    }
    if (e.key === "Enter" && items[active]) go(items[active].href);
  };

  let idx = -1;
  const Item = ({ href, title, sub, kind, keys, badge }: { href: string; title: string; sub?: string; kind?: string; keys?: string; badge?: React.ReactNode }) => {
    idx += 1;
    const i = idx;
    return (
      <Box
        component="button"
        type="button"
        onClick={() => go(href)}
        onMouseEnter={() => setActive(i)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          width: "100%",
          minHeight: 44,
          px: 1.5,
          py: 0.75,
          border: 0,
          borderRadius: "8px",
          bgcolor: active === i ? tokens.hover : "transparent",
          font: "inherit",
          textAlign: "left",
          cursor: "pointer",
          color: tokens.ink,
        }}
      >
        <Box sx={{ width: 28, height: 28, borderRadius: "7px", bgcolor: "#F0EFEB", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "#4A4E57", flex: "none", "& svg": { fontSize: 16 } }}>
          {badge}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontWeight: 500 }}>{title}</Box>
          {sub && <Box sx={{ fontSize: 12.5, color: "text.secondary" }}>{sub}</Box>}
        </Box>
        {kind && <Box sx={{ fontSize: 12, color: "text.secondary" }}>{kind}</Box>}
        {keys && <Kbd>{keys}</Kbd>}
      </Box>
    );
  };
  const Group = ({ children }: { children: React.ReactNode }) => (
    <Box sx={{ fontSize: 11, fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", color: "#7D828B", px: 1.5, pt: 1.5, pb: 0.5 }}>{children}</Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" sx={{ "& .MuiDialog-container": { alignItems: "flex-start", pt: { xs: 0, sm: "10vh" } } }} aria-label="Search and create">
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, height: 56, borderBottom: `1px solid ${tokens.divider}` }}>
        <SearchOutlined sx={{ color: "text.secondary" }} />
        <InputBase
          autoFocus
          fullWidth
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search customers, projects, invoices, or type a command…"
          inputProps={{ "aria-label": "Search ContractorOS", type: "search" }}
          sx={{ fontSize: 15 }}
        />
        <Box component="button" onClick={onClose} aria-label="Close search" sx={{ border: 0, bgcolor: "transparent", cursor: "pointer", p: 0 }}>
          <Kbd>Esc</Kbd>
        </Box>
      </Stack>
      <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${tokens.divider}` }}>
        {CHIPS.map((c) => (
          <Box
            key={c}
            component="button"
            type="button"
            aria-pressed={chip === c}
            onClick={() => setChip(c)}
            sx={{
              height: 28,
              px: 1.25,
              borderRadius: "14px",
              font: "inherit",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              border: `1px solid ${chip === c ? tokens.ink : tokens.borderStrong}`,
              bgcolor: chip === c ? tokens.ink : "#fff",
              color: chip === c ? "#fff" : tokens.ink2,
            }}
          >
            {c}
          </Box>
        ))}
      </Stack>
      <Box sx={{ maxHeight: "55vh", overflowY: "auto", p: 1 }}>
        {showCreate && (
          <>
            <Group>Create</Group>
            {CREATE.map((c) => (
              <Item key={c.label} href={c.href} title={c.label} keys={c.keys} badge={<AddOutlined />} />
            ))}
          </>
        )}
        {results.length > 0 && (
          <>
            <Group>{showCreate ? "Recent" : `${results.length} results`}</Group>
            {(showCreate ? results.slice(0, 4) : results).map((r) => (
              <Item key={r.href + r.title} href={r.href} title={r.title} sub={r.sub} kind={r.kind} badge={r.badge} />
            ))}
          </>
        )}
        {results.length === 0 && (
          <Stack alignItems="center" gap={0.5} sx={{ py: 5, textAlign: "center" }}>
            <Box sx={{ fontWeight: 500 }}>No matches for “{q}”</Box>
            <Box sx={{ color: "text.secondary", fontSize: 13 }}>Search by name, address, phone, or a number like INV-3108.</Box>
          </Stack>
        )}
        {showCreate && (
          <>
            <Group>Go to</Group>
            {GOTO.map((g) => (
              <Item key={g.label} href={g.href} title={g.label} badge={g.keys} />
            ))}
          </>
        )}
      </Box>
      <Stack direction="row" gap={2} flexWrap="wrap" sx={{ px: 2, py: 1.25, borderTop: `1px solid ${tokens.divider}`, bgcolor: tokens.surfaceMuted, fontSize: 12, color: "text.secondary", "& > span": { display: "flex", gap: 0.5, alignItems: "center" } }}>
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>Move
        </span>
        <span>
          <Kbd>Enter</Kbd>Open
        </span>
        <span>
          <Kbd>Esc</Kbd>Close
        </span>
        <Box component="span" sx={{ ml: "auto", display: { xs: "none !important", sm: "flex !important" } }}>
          Only records you have access to are shown
        </Box>
      </Stack>
    </Dialog>
  );
}

export { Kbd };
