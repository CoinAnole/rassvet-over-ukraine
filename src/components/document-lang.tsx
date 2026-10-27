import { createContext, useCallback, useContext, useState } from "react";
import type { Lang } from "@/lib/catalog/types";

const Ctx = createContext<{ lang: Lang; setLang: (lang: Lang) => void } | null>(null);

/**
 * The server language is the first paint. A reader switch publishes the same
 * value into `<html lang>` without reading localStorage during render.
 */
export function DocumentLangProvider({
  serverLang,
  children,
}: {
  serverLang: Lang;
  children: React.ReactNode;
}) {
  const [override, setOverride] = useState<Lang | null>(null);
  const setLang = useCallback((next: Lang) => {
    setOverride((prev) => (prev === next ? prev : next));
  }, []);
  return (
    <Ctx.Provider value={{ lang: override ?? serverLang, setLang }}>{children}</Ctx.Provider>
  );
}

export function useDocumentLang(): { lang: Lang; setLang: (lang: Lang) => void } | null {
  return useContext(Ctx);
}
