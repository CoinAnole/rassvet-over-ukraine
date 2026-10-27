import { createServerFn } from "@tanstack/react-start";
import { THEME_KEY, parseTheme, type ThemeChoice } from "./theme.ts";

export const readThemeChoice = createServerFn({ method: "POST" }).handler(
  async (): Promise<ThemeChoice> => {
    const { getCookie } = await import("@tanstack/react-start/server");
    return parseTheme(getCookie(THEME_KEY));
  },
);
