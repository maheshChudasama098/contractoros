// Design tokens from the "ContractorOS UI" design canvas (DesignSystem board).
export const tokens = {
  bg: "#F6F6F3",
  surface: "#FFFFFF",
  surfaceMuted: "#FBFBF9",
  ink: "#16181D",
  ink2: "#2B2E35",
  muted: "#5E636E",
  subtle: "#8A8F99",
  border: "#E6E5E0",
  borderStrong: "#DEDDD7",
  divider: "#EFEEEA",
  rowDivider: "#F1F0EC",
  hover: "#EFEEEA",
  brand: "#B54A1C",
  brandHover: "#96390F",
  brandBorder: "#A3421A",
  brandSoft: "#FBEEE7",
  brandRing: "#FBE6DA",
  sidebar: "#121418",
  sidebarHover: "#1C1F24",
  sidebarActive: "#262A31",
  sidebarText: "#B4B8C0",
  danger: "#B42318",
  dangerSoft: "#FDECEA",
} as const;

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

export const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "#F0EFEB", fg: "#4A4E57" },
  info: { bg: "#EAF0FD", fg: "#1E40AF" },
  success: { bg: "#E7F4EC", fg: "#166534" },
  warning: { bg: "#FDF3DC", fg: "#8A4B08" },
  danger: { bg: "#FDECEA", fg: "#B42318" },
  brand: { bg: "#FBEEE7", fg: "#8A3410" },
};

export const fontSans = "var(--font-sans), system-ui, -apple-system, sans-serif";
export const fontMono = "var(--font-geist-mono), ui-monospace, monospace";
