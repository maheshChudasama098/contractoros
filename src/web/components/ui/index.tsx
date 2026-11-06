"use client";

import Box, { type BoxProps } from "@mui/material/Box";
import Card from "@mui/material/Card";
import Drawer from "@mui/material/Drawer";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import MenuItem from "@mui/material/MenuItem";
import TableCell from "@mui/material/TableCell";
import TablePagination from "@mui/material/TablePagination";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import type { ReactNode } from "react";
import { tokens, toneColors, type Tone } from "@web/theme/tokens";

/** Status pill with a leading dot (`.tag` in the design). */
export function StatusTag({ tone = "neutral", children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  const c = toneColors[tone];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        height: 22,
        px: 1,
        borderRadius: "6px",
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
        bgcolor: c.bg,
        color: c.fg,
        "&::before": dot ? { content: '""', width: 6, height: 6, borderRadius: "50%", bgcolor: "currentColor" } : undefined,
      }}
    >
      {children}
    </Box>
  );
}

/** Tabular-number text for money, IDs and counts. */
export function Num({ children, sx, ...rest }: BoxProps) {
  return (
    <Box
      component="span"
      sx={{ typography: "num", ...sx }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function Muted({ children, sx, ...rest }: BoxProps) {
  return (
    <Box component="span" sx={{ color: "text.secondary", ...sx }} {...rest}>
      {children}
    </Box>
  );
}

/** Card with an optional header row (`.card` + `.ch`). */
export function SectionCard({
  title,
  action,
  children,
  sx,
  bodySx,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  sx?: BoxProps["sx"];
  bodySx?: BoxProps["sx"];
}) {
  return (
    <Card sx={{ overflow: "hidden", ...sx }}>
      {(title || action) && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          gap={1.5}
          sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${tokens.divider}`, "& a": { fontSize: 13, fontWeight: 500 } }}
        >
          {typeof title === "string" ? <Typography variant="h3">{title}</Typography> : title}
          {action}
        </Stack>
      )}
      <Box sx={bodySx}>{children}</Box>
    </Card>
  );
}

/** Page title block with optional eyebrow, subtitle and right-hand actions. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Stack direction="row" flexWrap="wrap" alignItems="flex-end" justifyContent="space-between" gap={2}>
      <Stack gap={0.5} minWidth={0}>
        {eyebrow && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{eyebrow}</Typography>}
        <Typography variant="h1">{title}</Typography>
        {subtitle && <Typography sx={{ color: "text.secondary" }}>{subtitle}</Typography>}
      </Stack>
      {actions && (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

export type Kpi = { label: string; value: ReactNode; hint?: ReactNode; hintTone?: "danger" | "success" };

/** Row of key figures sharing one card (`section[aria-label=Key figures]`). */
export function KpiStrip({ items, min = 220 }: { items: Kpi[]; min?: number }) {
  return (
    <Card
      component="section"
      aria-label="Key figures"
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
        "& > div:not(:last-of-type)": { borderRight: `1px solid ${tokens.divider}` },
      }}
    >
      {items.map((k) => (
        <Stack key={k.label} gap={0.75} sx={{ px: 2.75, py: 2.5 }}>
          <Label>{k.label}</Label>
          <Num sx={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{k.value}</Num>
          {k.hint && (
            <Typography
              sx={{
                fontSize: 13,
                color: k.hintTone === "danger" ? tokens.danger : k.hintTone === "success" ? "#166534" : "text.secondary",
                fontWeight: k.hintTone ? 500 : 400,
              }}
            >
              {k.hint}
            </Typography>
          )}
        </Stack>
      ))}
    </Card>
  );
}

export function Label({ children, sx }: { children: ReactNode; sx?: BoxProps["sx"] }) {
  return (
    <Box component="span" sx={{ fontSize: 12, fontWeight: 500, color: "text.secondary", ...sx }}>
      {children}
    </Box>
  );
}

const avatarTones: Tone[] = ["brand", "info", "success", "warning", "neutral"];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((p) => /^[A-Za-z]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Initials avatar; tone is derived from the name so it is stable. */
export function InitialsAvatar({ name, size = 28, tone }: { name: string; size?: number; tone?: Tone }) {
  const t = tone ?? avatarTones[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % avatarTones.length]!;
  const c = toneColors[t];
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-grid",
        placeItems: "center",
        fontSize: size > 36 ? 14 : 11,
        fontWeight: 600,
        flex: "none",
        bgcolor: c.bg,
        color: c.fg,
      }}
    >
      {initials(name)}
    </Box>
  );
}

/** Rounded square icon tile used in attention rows and empty states. */
export function IconTile({ tone = "neutral", size = 32, children }: { tone?: Tone; size?: number; children: ReactNode }) {
  const c = toneColors[tone];
  return (
    <Box
      component="span"
      sx={{
        width: size,
        height: size,
        borderRadius: size > 40 ? "12px" : "8px",
        bgcolor: c.bg,
        color: c.fg,
        display: "grid",
        placeItems: "center",
        flex: "none",
        "& svg": { fontSize: size > 40 ? 22 : 16 },
      }}
    >
      {children}
    </Box>
  );
}

export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.25}>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{ flex: 1, "& .MuiLinearProgress-bar": { bgcolor: color ?? tokens.brand } }}
      />
      <Num sx={{ fontSize: 12, color: "text.secondary", minWidth: 32 }}>{value}%</Num>
    </Stack>
  );
}

/** Clickable list row (`a.row`). */
export function LinkRow({ href, children, last }: { href: string; children: ReactNode; last?: boolean }) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2.5,
        py: 1.5,
        color: "inherit",
        borderBottom: last ? 0 : `1px solid ${tokens.rowDivider}`,
        "&:hover": { bgcolor: tokens.surfaceMuted, color: "inherit" },
      }}
    >
      {children}
    </Box>
  );
}

/** Two-line text: bold title + muted subtitle. */
export function TwoLine({ title, sub, href }: { title: ReactNode; sub?: ReactNode; href?: string }) {
  return (
    <Box component="span" sx={{ flex: 1, minWidth: 0, display: "block" }}>
      {href ? (
        <Box component={Link} href={href} sx={{ display: "block", fontWeight: 500, color: tokens.ink, "&:hover": { color: tokens.brand } }}>
          {title}
        </Box>
      ) : (
        <Box component="span" sx={{ display: "block", fontWeight: 500 }}>
          {title}
        </Box>
      )}
      {sub && (
        <Box component="span" sx={{ display: "block", color: "text.secondary", fontSize: 13 }}>
          {sub}
        </Box>
      )}
    </Box>
  );
}

/**
 * Dropdown option with a muted second line (e.g. customer name + email). Sized for menus,
 * unlike TwoLine (table cells): no extra height, long text truncates instead of wrapping.
 */
export function OptionLabel({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  const line = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
  return (
    <Box component="span" sx={{ display: "block", minWidth: 0, flex: 1 }}>
      <Box component="span" sx={{ ...line, fontWeight: 500, fontSize: 13.5, lineHeight: 1.35, color: tokens.ink }}>
        {primary}
      </Box>
      {secondary && (
        <Box component="span" sx={{ ...line, fontSize: 12, lineHeight: 1.3, color: "text.secondary" }}>
          {secondary}
        </Box>
      )}
    </Box>
  );
}

/** Pill-style segmented control (`role=group` toggles in the design). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <ToggleButtonGroup exclusive value={value} aria-label={label} onChange={(_, v: T | null) => v && onChange(v)}>
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** Key/value line used in summary side panels. */
export function KeyValue({ k, v, strong }: { k: ReactNode; v: ReactNode; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2} sx={{ fontSize: strong ? 15 : 13.5, fontWeight: strong ? 600 : 400 }}>
      <Box component="span" sx={{ color: strong ? tokens.ink : "text.secondary" }}>
        {k}
      </Box>
      <Box component="span" sx={{ textAlign: "right" }}>
        {v}
      </Box>
    </Stack>
  );
}

export function Logo({ size = 30, withText = true, dark = false }: { size?: number; withText?: boolean; dark?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.25}>
      <Box sx={{ width: size, height: size, borderRadius: "8px", bgcolor: tokens.brand, display: "grid", placeItems: "center" }}>
        <svg width={size * 0.57} height={size * 0.57} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 11.5L12 4l9 7.5M6 10v9h12v-9M10 19v-5h4v5" />
        </svg>
      </Box>
      {withText && (
        <Typography component="span" sx={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em", color: dark ? "#fff" : tokens.ink }}>
          ContractorOS
        </Typography>
      )}
    </Stack>
  );
}

/** Responsive two-column layout: wide main + side rail; stacks below md. */
export function SplitLayout({ main, side, sideWidth = 360 }: { main: ReactNode; side: ReactNode; sideWidth?: number }) {
  return (
    <Box sx={{ display: "grid", gap: 3, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: `minmax(0,1fr) ${sideWidth}px` } }}>
      <Stack gap={3} minWidth={0}>
        {main}
      </Stack>
      <Stack gap={3} minWidth={0}>
        {side}
      </Stack>
    </Box>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <Stack alignItems="center" textAlign="center" gap={1.5} sx={{ py: 6, px: 3 }}>
      <IconTile size={48}>{icon}</IconTile>
      <Typography variant="h3">{title}</Typography>
      {body && <Typography sx={{ color: "text.secondary", maxWidth: 380 }}>{body}</Typography>}
      {action}
    </Stack>
  );
}

/** Filter input with a leading search icon. */
export function SearchField({ placeholder, value, onChange, label }: { placeholder: string; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        height: 40,
        px: 1.5,
        flex: "1 1 260px",
        maxWidth: 360,
        bgcolor: "#fff",
        border: `1px solid ${tokens.borderStrong}`,
        borderRadius: "8px",
        color: "text.secondary",
        "&:focus-within": { borderColor: tokens.brand, boxShadow: `0 0 0 3px ${tokens.brandRing}` },
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <Box
        component="input"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        sx={{ border: 0, outline: 0, flex: 1, minWidth: 0, font: "inherit", fontSize: 14, color: tokens.ink, bgcolor: "transparent" }}
      />
    </Box>
  );
}

/** Underlined tab-style links/buttons (`.tab` / `.seg`). */
export function TabBar<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode; icon?: ReactNode; count?: ReactNode }[];
  label: string;
}) {
  return (
    <Box
      component="nav"
      aria-label={label}
      // Inset shadow draws the baseline inside the box, so the active underline never overflows and adds a scrollbar.
      sx={{ display: "flex", gap: 2.5, boxShadow: `inset 0 -1px 0 ${tokens.border}`, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}
    >
      {items.map((i) => {
        const on = i.value === value;
        return (
          <Box
            key={i.value}
            component="button"
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(i.value)}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              "& svg": { fontSize: 18 },
              height: 44,
              px: 0.25,
              border: 0,
              borderBottom: `2px solid ${on ? tokens.brand : "transparent"}`,
              bgcolor: "transparent",
              font: "inherit",
              fontSize: 13.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
              cursor: "pointer",
              color: on ? tokens.ink : "text.secondary",
              "&:hover": { color: tokens.ink },
            }}
          >
            {i.icon}
            {i.label}
            {i.count != null && <Num sx={{ fontSize: 12, color: "text.secondary" }}>{i.count}</Num>}
          </Box>
        );
      })}
    </Box>
  );
}

/** Definition list used in "Details" side cards. */
export function DetailList({ items }: { items: { k: string; v: ReactNode }[] }) {
  return (
    <Box component="dl" sx={{ m: 0, px: 2.5, py: 2, display: "grid", gridTemplateColumns: "110px minmax(0,1fr)", rowGap: 1.5, columnGap: 2, fontSize: 13.5 }}>
      {items.map((i) => (
        <Box key={i.k} sx={{ display: "contents" }}>
          <Box component="dt" sx={{ color: "text.secondary" }}>
            {i.k}
          </Box>
          <Box component="dd" sx={{ m: 0, minWidth: 0, overflowWrap: "anywhere" }}>
            {i.v}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
      {children}
    </Stack>
  );
}

export const money =(n: number, cents = false) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

export const PAGE_SIZES = [10, 25, 50];

/** Standard pager under every paginated table. `page` is 0-based. */
export function Pager({
  total,
  page,
  perPage,
  onPage,
  onPerPage,
}: {
  total: number;
  page: number;
  perPage: number;
  onPage: (page: number) => void;
  onPerPage: (perPage: number) => void;
}) {
  return (
    <TablePagination
      component="div"
      count={total}
      page={page}
      rowsPerPage={perPage}
      rowsPerPageOptions={PAGE_SIZES}
      onPageChange={(_, p) => onPage(p)}
      onRowsPerPageChange={(e) => (onPerPage(Number(e.target.value)), onPage(0))}
    />
  );
}

/**
 * Standard list layout: status tabs above the card; inside the card a toolbar with
 * search on the left and filters on the right, then the table (or empty state) and pager.
 * The page's primary action lives in its PageHeader, not here.
 */
export function ListCard({
  tabs,
  filters,
  search,
  children,
}: {
  tabs?: ReactNode;
  filters?: ReactNode;
  search?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {tabs}
      <Card sx={{ overflow: "hidden" }}>
        {(filters || search) && (
          <Stack
            direction="row"
            flexWrap="wrap"
            alignItems="center"
            gap={1}
            sx={{ px: 2.5, py: 1.25, borderBottom: `1px solid ${tokens.divider}` }}
          >
            <Box sx={{ display: "flex", flex: "1 1 260px", minWidth: 0 }}>{search}</Box>
            {filters && (
              <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} sx={{ ml: "auto" }}>
                {filters}
              </Stack>
            )}
          </Stack>
        )}
        {children}
      </Card>
    </>
  );
}

/** Compact dropdown filter for a list toolbar: shows "Label: Value". */
export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      aria-label={label}
      sx={{ minWidth: 150 }}
      SelectProps={{
        renderValue: (v) => (
          <Box component="span" sx={{ fontSize: 13.5 }}>
            <Box component="span" sx={{ color: "text.secondary" }}>
              {label}:
            </Box>{" "}
            {options.find((o) => o.value === v)?.label}
          </Box>
        ),
      }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

export type Sort<K extends string> = { key: K; dir: "asc" | "desc" };

/** Sortable column header. Clicking the active column flips the direction. */
export function SortHead<K extends string>({
  k,
  sort,
  onSort,
  children,
  align,
}: {
  k: K;
  sort: Sort<K>;
  onSort: (s: Sort<K>) => void;
  children: ReactNode;
  align?: "right";
}) {
  const active = sort.key === k;
  return (
    <TableCell align={align} sortDirection={active ? sort.dir : false}>
      <TableSortLabel
        active={active}
        direction={active ? sort.dir : "asc"}
        onClick={() => onSort({ key: k, dir: active && sort.dir === "asc" ? "desc" : "asc" })}
      >
        {children}
      </TableSortLabel>
    </TableCell>
  );
}

/** Client-side sort for small, fully loaded lists. Nulls/empties always sort last. */
export function sortRows<T, K extends string>(rows: T[], sort: Sort<K>, value: (row: T, key: K) => string | number | null | undefined): T[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a, sort.key);
    const y = value(b, sort.key);
    if (x == null || x === "") return y == null || y === "" ? 0 : 1;
    if (y == null || y === "") return -1;
    return sign * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }));
  });
}

/**
 * Right-side panel for add/edit forms. Drop-in for `<Dialog>`: children use
 * DialogTitle / DialogContent / DialogActions (inside a Formik <Form> or not);
 * the title and actions stay pinned while the content scrolls.
 */
export function FormDrawer({
  open,
  onClose,
  width = 520,
  children,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
  onSubmit?: React.FormEventHandler<HTMLDivElement>;
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: `min(${width}px, 100vw)` },
            display: "flex",
            flexDirection: "column",
            "& > form": { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 },
            "& .MuiDialogTitle-root": { px: 3, py: 2, borderBottom: `1px solid ${tokens.divider}` },
            "& .MuiDialogContent-root": { flex: 1, overflowY: "auto", px: 3, pt: "20px !important", pb: 3 },
            "& .MuiDialogActions-root": { px: 3, py: 1.5, borderTop: `1px solid ${tokens.divider}`, mt: "auto" },
          },
        },
      }}
    >
      {children}
    </Drawer>
  );
}
