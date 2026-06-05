export const crmColors = {
  primary: "#ea580c",
  primaryLight: "#fb923c",
  primaryDark: "#c2410c",
  secondary: "#0f766e",
  ink: "#0f172a",
  slate: "#475569",
  surface: "#f8fafc",
  surfaceStrong: "#ffffff",
  line: "rgba(15, 23, 42, 0.08)",
  lineStrong: "rgba(15, 23, 42, 0.12)",
  success: "#15803d",
  warning: "#d97706",
  error: "#dc2626",
  info: "#2563eb",
  sidebar: "#0f172a",
  sidebarMuted: "rgba(255,255,255,0.68)",
} as const;

export const crmRadius = {
  xs: 8,
  sm: 4,
  md: 5,
  lg: 4,
  xl: 5,
  pill: 9,
} as const;

export const crmShadow = {
  panel: "0 22px 45px rgba(15, 23, 42, 0.08)",
  soft: "0 18px 40px rgba(15, 23, 42, 0.06)",
  focus: "0 14px 28px rgba(234, 88, 12, 0.18)",
  focusHover: "0 18px 36px rgba(234, 88, 12, 0.24)",
} as const;

export const crmGradients = {
  appBackground:
    "radial-gradient(circle at top left, rgba(251, 146, 60, 0.12), transparent 26%), linear-gradient(180deg, #f8fafc 0%, #eef4fb 100%)",
  sidebar:
    "radial-gradient(circle at top right, rgba(251, 146, 60, 0.28), transparent 30%), linear-gradient(180deg, #0f172a 0%, #111f34 100%)",
  hero: "radial-gradient(circle at top right, rgba(251, 146, 60, 0.22), transparent 30%), linear-gradient(135deg, #0f172a 0%, #1f3a5f 55%, #184e77 100%)",
  active:
    "linear-gradient(135deg, rgba(234, 88, 12, 0.26), rgba(251, 146, 60, 0.16))",
} as const;
