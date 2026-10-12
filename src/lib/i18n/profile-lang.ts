import { createServerFn } from "@tanstack/react-start";
import { isLang, LANG_KEY } from "./index.ts";
import type { Lang } from "../catalog/types.ts";

export type ProfileLang = {
  cookie: Lang | null;
  acceptLanguage: string | null;
};

export const readProfileLang = createServerFn({ method: "POST" }).handler(
  async (): Promise<ProfileLang> => {
    const { getCookie, getRequestHeader } = await import("@tanstack/react-start/server");
    const raw = getCookie(LANG_KEY);
    return {
      cookie: isLang(raw) ? raw : null,
      acceptLanguage: getRequestHeader("accept-language") ?? null,
    };
  },
);
