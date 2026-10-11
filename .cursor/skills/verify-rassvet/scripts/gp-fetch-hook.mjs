/**
 * Installed with `node --import` on the verification dev server only.
 * `loadCatalog` fetches CelesTrak from that process, which Playwright's
 * page route cannot see. When VERIFY_RASSVET_GP_FIXTURE_FILE is set, those
 * GP responses are the harness fixture and every other fetch is unchanged.
 */
import { readFileSync } from "node:fs";

const file = process.env.VERIFY_RASSVET_GP_FIXTURE_FILE;
if (file) {
  const body = readFileSync(file);
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.includes("celestrak.org") && url.includes("/NORAD/elements/gp.php")) {
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return original(input, init);
  };
  console.error(`[verify-rassvet] GP fixture intercepting CelesTrak from ${file}`);
}
