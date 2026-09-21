import { createServerFn } from "@tanstack/react-start";
import type { CatalogPayload } from "./types.ts";

export const getCatalog = createServerFn({ method: "POST" }).handler(
  async (): Promise<CatalogPayload> => {
    const { loadCatalog } = await import("./fetch.server.ts");
    return loadCatalog();
  },
);
