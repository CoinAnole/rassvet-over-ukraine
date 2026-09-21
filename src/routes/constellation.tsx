import { createFileRoute } from "@tanstack/react-router";
import { LangFrame } from "@/components/lang-frame";
import { ConstellationView } from "@/components/constellation-view";
import { getCatalog } from "@/lib/catalog/get-catalog";

export const Route = createFileRoute("/constellation")({
  loader: async () => ({ catalog: await getCatalog() }),
  component: ConstellationPage,
});

function ConstellationPage() {
  const { catalog } = Route.useLoaderData();
  return (
    <LangFrame current="/constellation" catalog={catalog}>
      {(lang) => <ConstellationView lang={lang} catalog={catalog} />}
    </LangFrame>
  );
}
