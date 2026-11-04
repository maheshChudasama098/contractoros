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
    MuiAutocomplete: {
      styleOverrides: {
        // Autocomplete adds its own root padding on top of the 40px input; drop it so it matches text fields.
        inputRoot: {
          "&&": { padding: 0, paddingRight: 64 },
          "& .MuiAutocomplete-input": { "&&": { padding: "0 12px", height: 40 } },
        },
        endAdornment: { right: 8 },
        paper: { marginTop: 6, border: `1px solid ${tokens.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(16,24,40,.12)" },
        listbox: {
          padding: 6,
          maxHeight: 320,
          "& .MuiAutocomplete-option": {
            borderRadius: 6,
            padding: "8px 10px",
            minHeight: 0,
            "&.Mui-focused": { backgroundColor: tokens.hover },
            '&[aria-selected="true"], &[aria-selected="true"].Mui-focused': { backgroundColor: tokens.brandSoft },
          },
        },
        noOptions: { padding: "12px 14px", fontSize: 13.5, color: tokens.ink2 },
        loading: { padding: "12px 14px", fontSize: 13.5 },
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
    MuiTableSortLabel: {
      styleOverrides: {
        root: { "&:hover": { color: tokens.ink }, "&.Mui-active": { color: tokens.ink } },
        icon: { fontSize: 16 },
      },
    },
    MuiTablePagination: {
      defaultProps: { rowsPerPageOptions: [10, 25, 50] },
      styleOverrides: {
        root: { borderTop: `1px solid ${tokens.divider}`, color: tokens.ink2 },
        toolbar: { minHeight: 52, paddingLeft: 20, paddingRight: 12 },
        selectLabel: { fontSize: 13, color: tokens.muted },
        displayedRows: { fontSize: 13, color: tokens.muted },
        // The global 40px select height doesn't fit the compact pagination row.
        select: { "&&": { height: 32, lineHeight: "32px", fontSize: 13 } },
        input: { marginRight: 20 },
        actions: { "& .MuiIconButton-root": { width: 32, height: 32 } },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: { border: `1px solid ${tokens.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(16,24,40,.12)" },
      },
    },
    MuiMenu: { styleOverrides: { list: { padding: 6, minWidth: 180 } } },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 13.5,
          borderRadius: 6,
          minHeight: 36,
          padding: "6px 10px",
          "&:hover": { background: tokens.hover },
          "&.Mui-selected, &.Mui-selected:hover": { background: tokens.brandSoft },
          "& .MuiListItemIcon-root": { minWidth: 30, color: tokens.ink2 },
        },
      },
    },
    // Segmented control (used for in-card filters and view switches).
    MuiToggleButtonGroup: {
      styleOverrides: { root: { padding: 3, background: tokens.hover, borderRadius: 9, gap: 2 } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          border: 0,
          height: 34,
          padding: "0 14px",
          borderRadius: "7px !important",
          textTransform: "none",
          fontSize: 13.5,
          fontWeight: 500,
          color: tokens.muted,
          "&.Mui-selected, &.Mui-selected:hover": { background: "#fff", color: tokens.ink, boxShadow: "0 1px 2px rgba(16,24,40,.08)" },
        },
      },
    },
    MuiBreadcrumbs: { styleOverrides: { root: { fontSize: 13 }, separator: { color: tokens.subtle } } },
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
