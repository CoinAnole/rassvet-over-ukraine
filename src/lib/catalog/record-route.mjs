/**
 * HTTP entry for the altitude recorder. The npm script calls the same
 * `runRecorder` implementation.
 */
import { timingSafeEqual } from "node:crypto";
import { writeBlobJson } from "./blob-data.mjs";
import {
  blobDataStore,
  readConfig,
  RECORDER_STATUS_PATH,
  recorderStatusDocument,
  runRecorder,
} from "../../../scripts/record-altitude-history.mjs";

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
 *   readConfig?: () => object,
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
  try {
    const loadConfig = deps.readConfig ?? readConfig;
    const { result, status } = await runRecorder({
      store: deps.store ?? blobDataStore(),
      config: deps.config ?? loadConfig(),
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
  } catch (err) {
    return failureResponse(err, secret, deps);
  }
}

/**
 * @param {unknown} err
 * @param {string | undefined} secret
 */
function publicError(err, secret) {
  let message = err instanceof Error ? err.message : String(err);
  const hidden = [secret, process.env.CRON_SECRET, process.env.BLOB_READ_WRITE_TOKEN];
  for (const value of hidden) {
    if (typeof value === "string" && value.length > 0)
      message = message.split(value).join("[redacted]");
  }
  return message;
}

/**
 * @param {unknown} err
 * @param {string | undefined} secret
 * @param {{
 *   writeStatus?: boolean,
 *   writeStatusBlob?: (pathname: string, body: unknown) => Promise<unknown>,
 *   now?: Date,
 * }} deps
 */
async function failureResponse(err, secret, deps) {
  const ranAt =
    deps.now instanceof Date && !Number.isNaN(deps.now.getTime()) ? deps.now : new Date();
  const status = recorderStatusDocument(
    {
      exitCode: 1,
      error: publicError(err, secret),
      rowsBefore: null,
      rowsAfter: null,
      unlisted: [],
    },
    ranAt,
  );
  if (deps.writeStatus !== false) {
    const write = deps.writeStatusBlob ?? writeBlobJson;
    try {
      await write(RECORDER_STATUS_PATH, status);
    } catch (writeErr) {
      const message = publicError(writeErr, secret);
      status.error = status.error ? `${status.error} Status was not saved (${message}).` : message;
    }
  }
  return Response.json(status, { status: 500 });
}
