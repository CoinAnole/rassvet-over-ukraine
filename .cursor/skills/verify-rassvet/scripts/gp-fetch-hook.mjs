/**
 * Installed with `node --import` on the verification dev server only.
 * `loadCatalog` fetches CelesTrak and the altitude-history raw URL from that
 * process, which Playwright's page route cannot see. When the fixture files
 * are set, those responses are the harness fixtures. Every other fetch is unchanged.
 */
import { readFileSync } from "node:fs";

const file = process.env.VERIFY_RASSVET_GP_FIXTURE_FILE;
const historyFile = process.env.VERIFY_RASSVET_HISTORY_FIXTURE_FILE;
if (file || historyFile) {
  const body = file ? readFileSync(file) : null;
  const historyBody = historyFile ? readFileSync(historyFile) : null;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (body && url.includes("celestrak.org") && url.includes("/NORAD/elements/gp.php")) {
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (historyBody && url.includes("altitude-history.json")) {
      return new Response(historyBody, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return original(input, init);
  };
  if (file) console.error(`[verify-rassvet] GP fixture intercepting CelesTrak from ${file}`);
  if (historyFile) {
    console.error(`[verify-rassvet] altitude history fixture from ${historyFile}`);
  }
}
