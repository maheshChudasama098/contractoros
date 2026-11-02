"use client";

import ArrowBackOutlined from "@mui/icons-material/ArrowBackOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card, { type CardProps } from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Muted } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";

// Portal is homeowner-facing: larger type, 52px touch targets, single column.

export function PortalShell({ token, subtitle, back, tabs = true, contact = true, children }: { token: string; subtitle: string; back?: boolean; tabs?: boolean; contact?: boolean; children: ReactNode }) {
  const path = usePathname();
  const base = `/portal/${token}`;
  const TABS = [
    ["Overview", base],
    ["Photos & docs", `${base}/docs`],
    ["Payments", `${base}/payments`],
  ];
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: tokens.bg, display: "flex", flexDirection: "column", fontSize: 15 }}>
      <Box component="header" sx={{ bgcolor: "#fff", borderBottom: `1px solid ${tokens.border}`, position: "sticky", top: 0, zIndex: 5 }}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ maxWidth: 560, mx: "auto", px: 2, py: 1.5 }}>
          {back ? (
            <IconButton component={Link} href={base} aria-label="Back to project" sx={{ width: 44, height: 44 }}>
              <ArrowBackOutlined />
            </IconButton>
          ) : (
            <Box sx={{ width: 40, height: 40, borderRadius: "10px", bgcolor: "#3A2A22", color: "#F5C9B1", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 14, flex: "none" }}>HP</Box>
          )}
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ fontWeight: 600 }}>Harbor &amp; Pine Remodeling</Box>
            <Muted sx={{ fontSize: 13 }}>{subtitle}</Muted>
          </Stack>
          {contact && !back && (
            <Button component={Link} href={`${base}#team`} sx={{ height: 44 }}>
              Contact
            </Button>
          )}
        </Stack>
      </Box>
      <Stack component="main" gap={2} sx={{ flex: 1, width: "100%", maxWidth: 560, mx: "auto", px: 2, pt: 2, pb: 5 }}>
        {tabs && (
          <Stack component="nav" aria-label="Portal sections" direction="row" sx={{ p: "3px", bgcolor: tokens.hover, borderRadius: "12px" }}>
            {TABS.map(([l, href]) => {
              const on = path === href;
              return (
                <Box key={l} component={Link} href={href!} aria-current={on ? "page" : undefined} sx={{ flex: 1, textAlign: "center", py: 1.25, borderRadius: "10px", fontSize: 14, fontWeight: 500, color: on ? tokens.ink : "text.secondary", bgcolor: on ? "#fff" : "transparent", boxShadow: on ? "0 1px 2px rgba(16,24,40,.08)" : undefined }}>
                  {l}
                </Box>
              );
            })}
          </Stack>
        )}
        {children}
        <Stack component="footer" alignItems="center" gap={0.5} sx={{ pt: 2, fontSize: 12, color: "text.secondary", textAlign: "center" }}>
          <span>Powered by ContractorOS</span>
        </Stack>
      </Stack>
    </Box>
  );
}

export function PCard({ children, sx, ...rest }: CardProps) {
  return (
    <Card sx={{ borderRadius: "16px", p: 2.5, display: "flex", flexDirection: "column", gap: 1.75, ...sx }} {...rest}>
      {children}
    </Card>
  );
}

export function PH2({ children }: { children: ReactNode }) {
  return <Typography sx={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{children}</Typography>;
}

/** Label/value line used throughout the portal. */
export function Ln({ k, v, strong, muted }: { k: ReactNode; v: ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2} sx={{ py: 1, borderTop: strong ? `1px solid ${tokens.divider}` : 0, fontWeight: strong ? 600 : 400 }}>
      <Box sx={{ color: muted ? "text.secondary" : undefined }}>{k}</Box>
      <Box sx={{ textAlign: "right", typography: "num", whiteSpace: "nowrap" }}>{v}</Box>
    </Stack>
  );
}

export const bigBtn = { minHeight: 52, height: "auto", borderRadius: "12px", fontSize: 16 } as const;
