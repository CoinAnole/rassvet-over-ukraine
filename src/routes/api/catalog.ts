import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/catalog")({
  server: {
    handlers: {
      GET: async () => {
        const { loadCatalog } = await import("@/lib/catalog/fetch.server");
        const payload = await loadCatalog();
        return Response.json(payload, {
          headers: {
            "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
          },
        });
      },
    },
  },
});
