import { createFileRoute } from "@tanstack/react-router";
import { LangFrame } from "@/components/lang-frame";
import { MethodView } from "@/components/method-view";
import { getCatalog } from "@/lib/catalog/get-catalog";

export const Route = createFileRoute("/method")({
  loader: async () => ({ catalog: await getCatalog() }),
  component: MethodPage,
});

function MethodPage() {
  const { catalog } = Route.useLoaderData();
  return (
    <LangFrame current="/method" catalog={catalog}>
      {(lang) => <MethodView lang={lang} />}
    </LangFrame>
  );
}
