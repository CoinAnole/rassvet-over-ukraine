import { useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/catalog/types";
import { themeKeyAction, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/cn";

const CHOICES: ThemeChoice[] = ["system", "light", "dark"];

export function ThemeSwitch({ lang }: { lang: Lang }) {
  const t = getDict(lang).theme;
  const { choice, setChoice } = useTheme();
  const refs = useRef<Partial<Record<ThemeChoice, HTMLButtonElement | null>>>({});

  const choose = (next: ThemeChoice) => {
    setChoice(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t.label}
      className="flex rounded-[var(--radius-sm)] border border-border bg-surface p-0.5"
    >
      {CHOICES.map((id) => {
        const checked = choice === id;
        return (
          <button
            key={id}
            ref={(node) => {
              refs.current[id] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => choose(id)}
            onKeyDown={(event) => {
              const next = themeKeyAction(event.key, choice);
              if (!next) return;
              event.preventDefault();
              choose(next);
            }}
            className={cn(
              "min-h-9 rounded-[6px] px-2 text-xs font-medium",
              checked ? "bg-elevated text-fg" : "text-muted hover:text-fg",
            )}
          >
            {t[id]}
          </button>
        );
      })}
    </div>
  );
}
