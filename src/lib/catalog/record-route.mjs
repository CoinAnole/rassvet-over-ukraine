/**
 * HTTP entry for the altitude recorder. The npm script calls the same
 * `runRecorder` implementation.
 */
import { timingSafeEqual } from "node:crypto";
import { blobDataStore, readConfig, runRecorder } from "../../../scripts/record-altitude-history.mjs";

/**
 * @param {string | null | undefined} authorization
 * @param {string | undefined} secret
 */
export function cronAuthorized(authorization, secret) {
  if (!secret || !authorization) return false;
  const expected = `Bearer ${secret}`;
  const received = Buffer.from(authorization);
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length) return false;
  return timingSafeEqual(received, wanted);
}

/**
 * @param {Request} request
 * @param {{
 *   secret?: string,
 *   store?: object,
 *   config?: object,
 *   writeStatus?: boolean,
 *   writeStatusBlob?: (pathname: string, body: unknown) => Promise<unknown>,
 *   fetchImpl?: typeof fetch,
 *   sleep?: (ms: number) => Promise<void>,
 *   now?: Date,
 *   attempts?: number,
 *   timeoutMs?: number,
 *   log?: (msg: string) => void,
 *   warn?: (msg: string) => void,
 * }} [deps]
 */
export async function handleRecordAltitudes(request, deps = {}) {
  const secret = deps.secret === undefined ? process.env.CRON_SECRET : deps.secret;
  if (!cronAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { result, status } = await runRecorder({
    store: deps.store ?? blobDataStore(),
    config: deps.config ?? readConfig(),
    writeStatus: deps.writeStatus !== false,
    writeStatusBlob: deps.writeStatusBlob,
    fetchImpl: deps.fetchImpl,
    sleep: deps.sleep,
    now: deps.now,
    attempts: deps.attempts,
    timeoutMs: deps.timeoutMs,
    log: deps.log ?? (() => {}),
    warn: deps.warn ?? ((msg) => console.error(msg)),
  });
  return Response.json(status, { status: result.exitCode === 0 ? 200 : 500 });
}
