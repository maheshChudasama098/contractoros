"use client";

import { createTheme } from "@mui/material/styles";
import type { CSSProperties } from "react";

declare module "@mui/material/styles" {
  interface TypographyVariants {
    num: CSSProperties;
  }
  interface TypographyVariantsOptions {
    num?: CSSProperties;
  }
}
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    num: true;
  }
}
import { fontMono, fontSans, tokens } from "./tokens";

const shadowXs = "0 1px 2px rgba(16,24,40,.04)";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: tokens.brand, dark: tokens.brandHover, light: "#DD7A51", contrastText: "#FFFFFF" },
    secondary: { main: tokens.ink },
    error: { main: tokens.danger },
    warning: { main: "#8A4B08" },
    success: { main: "#166534" },
    info: { main: "#1E40AF" },
    background: { default: tokens.bg, paper: tokens.surface },
    text: { primary: tokens.ink, secondary: tokens.muted },
    divider: tokens.divider,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: fontSans,
    fontSize: 14,
    h1: { fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.25 },
    h2: { fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" },
    h3: { fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" },
    h4: { fontSize: 14, fontWeight: 600 },
    body1: { fontSize: 14, lineHeight: 1.5 },
    body2: { fontSize: 13, lineHeight: 1.5 },
    caption: { fontSize: 12 },
    overline: { fontSize: 11, fontWeight: 500, letterSpacing: ".06em", lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 500, fontSize: 13.5 },
    // Money, IDs and counts. Size/weight come from the caller.
    num: { fontFamily: fontMono, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased", fontFamily: fontSans },
        "button, input, select, textarea": { fontFamily: "inherit" },
        kbd: { fontFamily: fontMono },
        ":focus-visible": { outline: `2px solid ${tokens.brand}`, outlineOffset: 2 },
        ".num": { fontFamily: fontMono, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" },
        "td.num, th.num": { fontFamily: fontMono },
      },
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true, variant: "outlined", color: "inherit" },
      styleOverrides: {
        root: { height: 40, padding: "0 14px", borderRadius: 8, whiteSpace: "nowrap", gap: 8 },
        sizeSmall: { height: 32, padding: "0 10px", fontSize: 13 },
        sizeLarge: { height: 44, fontSize: 14 },
        startIcon: { marginRight: 0, marginLeft: 0 },
        endIcon: { marginRight: 0, marginLeft: 0 },
        containedPrimary: {
          border: `1px solid ${tokens.brandBorder}`,
          boxShadow: "0 1px 2px rgba(16,24,40,.1)",
          "&:hover": { background: tokens.brandHover },
        },
        containedError: { border: "1px solid #9B1D13" },
        outlined: {
          background: tokens.surface,
          borderColor: tokens.borderStrong,
          color: tokens.ink,
          boxShadow: shadowXs,
          "&:hover": { background: tokens.bg, borderColor: tokens.borderStrong },
        },
        text: { color: tokens.ink2, "&:hover": { background: tokens.hover } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 8, color: tokens.ink2, "&:hover": { background: tokens.hover } } },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { outlined: { borderColor: tokens.border, borderRadius: 12, boxShadow: shadowXs } },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiInputLabel: {
      defaultProps: { shrink: true },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: { fontSize: 13, fontWeight: 500, color: tokens.ink2, "&.Mui-focused": { color: tokens.ink2 } },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: tokens.surface,
          borderRadius: 8,
          boxShadow: "0 1px 2px rgba(16,24,40,.03)",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: tokens.borderStrong },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#C9C7BF" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: tokens.brand, borderWidth: 1 },
          "&.Mui-focused": { boxShadow: `0 0 0 3px ${tokens.brandRing}` },
          "&.Mui-error.Mui-focused, &.Mui-error": { boxShadow: `0 0 0 3px ${tokens.dangerSoft}` },
          "&.Mui-disabled": { background: tokens.surfaceMuted },
        },
        input: { padding: "0 12px", height: 40, fontSize: 14 },
        multiline: { padding: "10px 12px" },
        notchedOutline: { "& legend": { display: "none" }, top: 0 },
      },
    },
    MuiSelect: {
      styleOverrides: {
        // "&&" beats Select's own `height: auto; min-height: 1.4375em` so selects match text inputs (40px).
        select: { display: "flex", alignItems: "center", "&&": { height: 40, minHeight: 0, lineHeight: "40px" } },
      },
    },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 0, fontSize: 12 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${tokens.rowDivider}`, padding: "12px 20px", fontSize: 14 },
        head: {
          fontSize: 12,
          fontWeight: 500,
          color: tokens.muted,
          padding: "10px 20px",
          background: tokens.surfaceMuted,
          borderBottom: `1px solid ${tokens.divider}`,
          whiteSpace: "nowrap",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": { borderBottom: 0 },
          "&.MuiTableRow-hover:hover": { background: tokens.surfaceMuted },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44, borderBottom: `1px solid ${tokens.border}` },
        indicator: { height: 2, background: tokens.brand },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 0,
          padding: "0 2px",
          marginRight: 20,
          fontSize: 13.5,
          color: tokens.muted,
          "&.Mui-selected": { color: tokens.ink },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } } },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 16, boxShadow: "0 24px 48px rgba(16,24,40,.18)" } },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: 18, fontWeight: 600, padding: "24px 24px 8px" } } },
    MuiDialogContent: { styleOverrides: { root: { padding: "8px 24px 16px" } } },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px",
          borderTop: `1px solid ${tokens.divider}`,
          background: tokens.surfaceMuted,
          gap: 8,
        },
      },
    },
    MuiDrawer: { styleOverrides: { paper: { borderLeft: `1px solid ${tokens.border}` } } },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 6, borderRadius: 3, background: tokens.divider }, bar: { borderRadius: 3 } },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 10, fontSize: 13.5 } } },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked + .MuiSwitch-track": { opacity: 1 } },
      },
    },
    MuiCheckbox: { defaultProps: { size: "small" } },
    MuiTooltip: { styleOverrides: { tooltip: { background: tokens.ink, fontSize: 12 } } },
  },
});
