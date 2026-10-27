export type ThemeChoice = "system" | "light" | "dark";

export const THEME_KEY = "rassvet-theme";
export const THEME_ORDER = ["system", "light", "dark"] as const;

/** Page background, also used for `theme-color`. */
export const THEME_COLOR = {
  light: "#f6f4ef",
  dark: "#08090c",
} as const;

export function parseTheme(value: unknown): ThemeChoice {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

/** Absent attribute means follow `prefers-color-scheme`. */
export function themeAttribute(choice: ThemeChoice): "light" | "dark" | undefined {
  return choice === "system" ? undefined : choice;
}

export function themeFromCookieHeader(header: string | null | undefined): ThemeChoice {
  if (!header) return "system";
  const match = header.match(new RegExp(`(?:^|;\\s*)${THEME_KEY}=([^;]*)`));
  if (!match) return "system";
  return parseTheme(decodeURIComponent(match[1]));
}

/** Arrow keys move the theme radios. Home is System, End is Dark. */
export function themeKeyAction(key: string, current: ThemeChoice): ThemeChoice | null {
  const index = THEME_ORDER.indexOf(current);
  if (key === "ArrowRight" || key === "ArrowDown") return THEME_ORDER[(index + 1) % THEME_ORDER.length];
  if (key === "ArrowLeft" || key === "ArrowUp") return THEME_ORDER[(index + THEME_ORDER.length - 1) % THEME_ORDER.length];
  if (key === "Home") return "system";
  if (key === "End") return "dark";
  return null;
}

export function persistTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_KEY}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}
