"use client";

import KeyboardArrowDownOutlined from "@mui/icons-material/KeyboardArrowDownOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import PersonOutline from "@mui/icons-material/PersonOutline";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { InitialsAvatar } from "@web/components/ui";
import { authApi } from "@web/features/auth/api";

export type ShellUser = { name: string; email: string; isSuperAdmin: boolean };

/** Header avatar + name; opens Profile / Change password / Log out. */
export function UserMenu({ user, compact }: { user: ShellUser; compact?: boolean }) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  const logout = async () => {
    close();
    await authApi.logout();
    router.replace("/login");
    router.refresh();
  };

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-label={`Account menu for ${user.name}`}
        sx={{ gap: 1, px: compact ? 0.5 : 1, minWidth: 0, border: 0, color: "text.primary", fontWeight: 500 }}
      >
        <InitialsAvatar name={user.name} size={30} />
        {!compact && (
          <>
            <Box component="span" sx={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.name}
            </Box>
            <KeyboardArrowDownOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
          </>
        )}
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 0.5 } } }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Box sx={{ fontWeight: 600, fontSize: 14 }}>{user.name}</Box>
          <Box sx={{ fontSize: 12.5, color: "text.secondary" }}>{user.email}</Box>
        </Box>
        <Divider />
        <MenuItem component={Link} href="/profile" onClick={close}>
          <ListItemIcon>
            <PersonOutline fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem component={Link} href="/change-password" onClick={close}>
          <ListItemIcon>
            <LockOutlined fontSize="small" />
          </ListItemIcon>
          Change password
        </MenuItem>
        <Divider />
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutOutlined fontSize="small" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}
