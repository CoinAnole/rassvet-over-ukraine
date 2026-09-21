import type { Lang } from "@/lib/catalog/types";
import { getDict } from "@/lib/i18n";
import { methodSections } from "@/lib/i18n/method";

export function MethodView({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const sections = methodSections(lang);
  return (
    <article className="mx-auto max-w-[72ch] pb-16">
      <h2 className="text-2xl font-medium tracking-[-0.03em]">{t.method.title}</h2>
      <p className="mt-3 text-muted">{t.method.lede}</p>
      <div className="mt-8 flex flex-col gap-10">
        {sections.map((section) => (
          <section key={section.heading}>
            <h3 className="text-lg font-medium tracking-[-0.02em]">{section.heading}</h3>
            {section.quote ? (
              <blockquote className="mt-4 border-l-2 border-accent bg-elevated px-4 py-3 text-sm leading-relaxed">
                {section.quote}
              </blockquote>
            ) : null}
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-fg/90">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
