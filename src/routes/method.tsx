import { createFileRoute } from "@tanstack/react-router";
import { LangFrame } from "@/components/lang-frame";
import { MethodView } from "@/components/method-view";
import { getCatalog } from "@/lib/catalog/get-catalog";
import { readProfileLang } from "@/lib/i18n/profile-lang";
import { parseLangSearch } from "@/lib/i18n/resolve-lang";

export const Route = createFileRoute("/method")({
  validateSearch: (search: Record<string, unknown>) => parseLangSearch(search),
  loader: async () => {
    const [catalog, profile] = await Promise.all([getCatalog(), readProfileLang()]);
    return { catalog, profile };
  },
  component: MethodPage,
});

function MethodPage() {
  const { catalog, profile } = Route.useLoaderData();
  const { lang: langParam } = Route.useSearch();
  return (
    <LangFrame current="/method" catalog={catalog} profile={profile} langParam={langParam}>
      {(lang) => <MethodView lang={lang} />}
    </LangFrame>
  );
}
