import { createFileRoute } from "@tanstack/react-router";
import { LangFrame } from "@/components/lang-frame";
import { ConstellationView } from "@/components/constellation-view";
import { getCatalog } from "@/lib/catalog/get-catalog";
import { readProfileLang } from "@/lib/i18n/profile-lang";
import { parseLangSearch } from "@/lib/i18n/resolve-lang";

export const Route = createFileRoute("/constellation")({
  validateSearch: (search: Record<string, unknown>) => parseLangSearch(search),
  loader: async () => {
    const [catalog, profile] = await Promise.all([getCatalog(), readProfileLang()]);
    return { catalog, profile };
  },
  component: ConstellationPage,
});

function ConstellationPage() {
  const { catalog, profile } = Route.useLoaderData();
  const { lang: langParam } = Route.useSearch();
  return (
    <LangFrame current="/constellation" catalog={catalog} profile={profile} langParam={langParam}>
      {(lang) => <ConstellationView lang={lang} catalog={catalog} />}
    </LangFrame>
  );
}
