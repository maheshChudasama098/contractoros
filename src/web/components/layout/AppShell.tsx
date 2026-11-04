"use client";

import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import UnfoldMoreOutlined from "@mui/icons-material/UnfoldMoreOutlined";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";
import { useBreadcrumbLabelFor } from "./breadcrumb-label";
import { BOTTOM_NAV, NAV, SECTION_LABELS, type NavItem } from "./nav";
import { Kbd, SearchPalette } from "./SearchPalette";
import { UserMenu, type ShellUser } from "./UserMenu";

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

function NavLink({
  item,
  active,
  compact,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <Box
      component={Link}
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={compact ? item.label : undefined}
      title={compact ? item.label : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        gap: 1.25,
        height: compact ? 44 : 36,
        width: compact ? 48 : "auto",
        px: compact ? 0 : 1.25,
        borderRadius: "7px",
        color: active ? "#fff" : tokens.sidebarText,
        bgcolor: active ? tokens.sidebarActive : "transparent",
        fontSize: 13.5,
        fontWeight: 500,
        "& svg": { fontSize: 18, color: active ? "#F0875A" : "inherit" },
        "&:hover": { bgcolor: active ? tokens.sidebarActive : tokens.sidebarHover, color: "#fff" },
      }}
    >
      {item.icon}
      {!compact && item.label}
      {!compact && item.count != null && (
        <Box component="span" sx={{ ml: "auto", fontSize: 11, fontWeight: 600, color: "#9A9FA8", typography: "num" }}>
          {item.count}
        </Box>
      )}
      {!compact && item.attention && (
        <Box
          component="span"
          aria-label="Needs attention"
          sx={{ ml: "auto", width: 7, height: 7, borderRadius: "50%", bgcolor: "#F59E0B" }}
        />
      )}
    </Box>
  );
}

function Sidebar({ compact, onNavigate, superAdmin }: { compact?: boolean; onNavigate?: () => void; superAdmin: boolean }) {
  const path = usePathname();
  return (
    <Stack
      component="nav"
      aria-label="Primary"
      gap={2.25}
      sx={{
        bgcolor: tokens.sidebar,
        height: "100%",
        overflowY: "auto",
        px: compact ? 1.5 : 1.5,
        py: 2.25,
        alignItems: compact ? "center" : "stretch",
      }}
    >
      <Box component={Link} href="/dashboard" sx={{ px: compact ? 0 : 1, py: 0.5 }}>
        <Logo dark withText={!compact} />
      </Box>
      {!compact && (
        <Box
          component="button"
          type="button"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            width: "100%",
            p: 1,
            bgcolor: "#1A1D22",
            border: "1px solid #2A2E35",
            borderRadius: "10px",
            color: "#fff",
            font: "inherit",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              bgcolor: "#3A2A22",
              color: "#F5C9B1",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              fontWeight: 600,
              flex: "none",
            }}
          >
            HP
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              Harbor &amp; Pine Remodeling
            </Box>
            <Box sx={{ fontSize: 12, color: "#9A9FA8" }}>Owner</Box>
          </Box>
          <UnfoldMoreOutlined sx={{ fontSize: 16, color: "#9A9FA8" }} />
        </Box>
      )}
      {NAV.filter((g) => superAdmin || !g.superAdminOnly).map((g, gi) => (
        <Stack
          key={gi}
          gap={0.25}
          sx={g.bottom ? { mt: "auto" } : undefined}
          alignItems={compact ? "center" : "stretch"}
        >
          {g.label && !compact && (
            <Box
              sx={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "#7D828B",
                px: 1.25,
                pb: 0.5,
              }}
            >
              {g.label}
            </Box>
          )}
          {g.items.map((i) => (
            <NavLink key={i.href} item={i} active={isActive(path, i.href)} compact={compact} onClick={onNavigate} />
          ))}
          {g.bottom && !compact && (
            <Box
              component={Link}
              href="/profile"
              onClick={onNavigate}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                mt: 1.25,
                pt: 1.5,
                px: 1,
                borderTop: "1px solid #23262C",
                color: "#fff",
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  bgcolor: "#2E3239",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                DR
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Box sx={{ fontSize: 13, fontWeight: 500 }}>Dana Ruiz</Box>
                <Box sx={{ fontSize: 12, color: "#9A9FA8" }}>dana@harborpine.com</Box>
              </Box>
            </Box>
          )}
        </Stack>
      ))}
    </Stack>
  );
}

function useBreadcrumbs() {
  const path = usePathname();
  const parts = path.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  if (parts[0]) crumbs.push({ label: SECTION_LABELS[parts[0]] ?? parts[0], href: `/${parts[0]}` });
  const detailHref = `/${parts[0]}/${parts[1]}`;
  const detailLabel = useBreadcrumbLabelFor(detailHref);
  if (parts[1])
    crumbs.push({
      label: detailLabel ?? (parts[1] === "new" ? "New" : decodeURIComponent(parts[1]).toUpperCase()),
      href: detailHref,
    });
  if (parts[2]) crumbs.push({ label: parts[2][0]!.toUpperCase() + parts[2].slice(1), href: path });
  return crumbs;
}

/**
 * The page itself renders its title (PageHeader), so the top bar only shows where you came from:
 * nothing on a top-level page, "Projects" on a project, "Projects / P-1001" deeper down.
 */
function useParentCrumbs() {
  return useBreadcrumbs().slice(0, -1);
}

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const path = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const parents = useParentCrumbs();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: tokens.bg }}>
      {/* Desktop sidebar (lg+) and icon rail (md) */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          flex: "none",
          width: { md: 76, lg: 248 },
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Box sx={{ display: { md: "none", lg: "block" }, height: "100%" }}>
          <Sidebar superAdmin={user.isSuperAdmin} />
        </Box>
        <Box sx={{ display: { md: "block", lg: "none" }, height: "100%" }}>
          <Sidebar compact superAdmin={user.isSuperAdmin} />
        </Box>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar */}
        <Stack
          direction="row"
          alignItems="center"
          gap={0.75}
          sx={{
            display: { xs: "flex", md: "none" },
            position: "sticky",
            top: 0,
            zIndex: 5,
            minHeight: 56,
            pl: 2,
            pr: 1,
            bgcolor: "#fff",
            borderBottom: `1px solid ${tokens.border}`,
          }}
        >
          <Box component={Link} href="/dashboard" aria-label="Dashboard" sx={{ flex: 1, minWidth: 0 }}>
            <Logo />
          </Box>
          <IconButton aria-label="Search" onClick={() => setSearchOpen(true)} sx={{ width: 44, height: 44 }}>
            <SearchOutlined />
          </IconButton>
          <UserMenu user={user} compact />
        </Stack>

        {/* Desktop header */}
        <Stack
          component="header"
          direction="row"
          flexWrap="wrap"
          alignItems="center"
          gap={1.5}
          sx={{
            display: { xs: "none", md: "flex" },
            minHeight: 60,
            px: { md: 3, lg: 4 },
            py: 1.25,
            bgcolor: "#fff",
            borderBottom: `1px solid ${tokens.border}`,
          }}
        >
          <Button
            onClick={() => setSearchOpen(true)}
            startIcon={<SearchOutlined sx={{ fontSize: "15px !important" }} />}
            sx={{ width: 320, justifyContent: "flex-start", color: "text.secondary", fontWeight: 400 }}
          >
            Search or jump to…
            <Box sx={{ ml: "auto" }}>
              <Kbd>⌘K</Kbd>
            </Box>
          </Button>
          <Box sx={{ ml: "auto" }}>
            <UserMenu user={user} />
          </Box>
        </Stack>

        <Box
          component="main"
          sx={{
            width: "100%",
            maxWidth: 1360,
            px: { xs: 2, md: 3, lg: 4 },
            pt: { xs: 2, md: 3.5 },
            pb: { xs: 13, md: 8 },
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, md: 3 },
          }}
        >
          {parents.length > 0 && (
            // Where you came from; the page renders its own title below.
            <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: { xs: -1, md: -2 } }}>
              {parents.map((c) => (
                <Box key={c.href} component={Link} href={c.href} sx={{ color: "text.secondary", "&:hover": { color: tokens.ink } }}>
                  {c.label}
                </Box>
              ))}
            </Breadcrumbs>
          )}
          {children}
        </Box>
      </Box>

      {/* Mobile bottom navigation */}
      <Box
        component="nav"
        aria-label="Mobile"
        sx={{
          display: { xs: "grid", md: "none" },
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 6,
          gridTemplateColumns: "repeat(5, minmax(0,1fr))",
          gap: "2px",
          bgcolor: "#fff",
          borderTop: `1px solid ${tokens.border}`,
          p: "6px 6px calc(6px + env(safe-area-inset-bottom))",
        }}
      >
        {BOTTOM_NAV.map((n) => {
          const active = isActive(path, n.href);
          return (
            <Box
              key={n.href}
              component={Link}
              href={n.href}
              aria-current={active ? "page" : undefined}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                minHeight: 52,
                borderRadius: "10px",
                fontSize: 11,
                fontWeight: 500,
                color: active ? tokens.brand : "text.secondary",
                "& svg": { fontSize: 22 },
              }}
            >
              {n.icon}
              {n.label}
            </Box>
          );
        })}
        <Box
          component="button"
          type="button"
          onClick={() => setMoreOpen(true)}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
            minHeight: 52,
            border: 0,
            bgcolor: "transparent",
            font: "inherit",
            fontSize: 11,
            fontWeight: 500,
            color: "text.secondary",
            "& svg": { fontSize: 22 },
          }}
        >
          <MoreHorizOutlined />
          More
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        PaperProps={{ sx: { width: 280, border: 0 } }}
      >
        <Sidebar onNavigate={() => setMoreOpen(false)} superAdmin={user.isSuperAdmin} />
      </Drawer>

      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
}
