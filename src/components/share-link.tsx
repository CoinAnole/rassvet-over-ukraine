import { useEffect, useRef, useState } from "react";
import { getDict } from "@/lib/i18n";
import type { Lang } from "@/lib/catalog/types";
import { shareUrl, type ViewSearch } from "@/lib/view-state";
import { Button } from "@/components/ui/button";

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection path when the clipboard API rejects.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.focus();
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("copy failed");
}

export function ShareLink({
  lang,
  search,
  syncUrl,
}: {
  lang: Lang;
  search: ViewSearch;
  syncUrl: () => void;
}) {
  const t = getDict(lang);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const href = () => shareUrl(window.location.origin, window.location.pathname, search);

  const onCopy = async () => {
    syncUrl();
    try {
      await writeClipboard(href());
      setCopied(true);
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const onShare = async () => {
    syncUrl();
    try {
      await navigator.share({ title: t.productTitle, url: href() });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  };

  return (
    <div className="flex flex-col gap-2 border-b border-border pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => void onCopy()}
          aria-describedby="share-link-hint"
        >
          {copied ? t.share.copied : t.share.copy}
        </Button>
        {canShare ? (
          <Button type="button" variant="outline" size="md" onClick={() => void onShare()}>
            {t.share.share}
          </Button>
        ) : null}
      </div>
      <p id="share-link-hint" className="text-xs leading-snug text-subtle">
        {t.share.hint}
      </p>
    </div>
  );
}
