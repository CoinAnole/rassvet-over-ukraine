import { createContext, useCallback, useContext, useState } from "react";
import { persistTheme, type ThemeChoice } from "@/lib/theme";

const Ctx = createContext<{ choice: ThemeChoice; setChoice: (choice: ThemeChoice) => void } | null>(
  null,
);

export function ThemeProvider({
  serverChoice,
  children,
}: {
  serverChoice: ThemeChoice;
  children: React.ReactNode;
}) {
  const [override, setOverride] = useState<ThemeChoice | null>(null);
  const setChoice = useCallback((next: ThemeChoice) => {
    persistTheme(next);
    setOverride(next);
  }, []);
  return (
    <Ctx.Provider value={{ choice: override ?? serverChoice, setChoice }}>{children}</Ctx.Provider>
  );
}

export function useTheme(): { choice: ThemeChoice; setChoice: (choice: ThemeChoice) => void } {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("ThemeProvider missing");
  return ctx;
}
