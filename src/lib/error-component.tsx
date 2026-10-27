import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useDocumentLang } from "@/components/document-lang";
import { Button } from "@/components/ui/button";
import { getDict } from "@/lib/i18n";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const doc = useDocumentLang();
  const t = getDict(doc?.lang ?? "en").error;
  const detail = error instanceof Error && error.message ? error.message : t.body;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-status-decay" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">{t.title}</h1>
      <p className="max-w-md text-sm break-words text-muted">{detail}</p>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={() => window.location.reload()}
      >
        {t.reload}
      </Button>
    </main>
  );
}
