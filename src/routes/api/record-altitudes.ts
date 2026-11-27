import { createFileRoute } from "@tanstack/react-router";
import { handleRecordAltitudes } from "@/lib/catalog/record-route.mjs";

/** Hobby maximum. Worst-case GP retries are about 105s. */
export const RECORD_ALTITUDES_MAX_DURATION = 300;

export const Route = createFileRoute("/api/record-altitudes")({
  server: {
    handlers: {
      GET: async (ctx) => {
        const request = ctx instanceof Request ? ctx : ctx.request;
        return handleRecordAltitudes(request);
      },
    },
  },
});
