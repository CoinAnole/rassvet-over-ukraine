#!/usr/bin/env node
/**
 * Headless harness for the Rassvet over Ukraine web UI.
 *
 *   .cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs launch
 *   .cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs doctor
 *   .cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs browser open /
 *   .cursor/skills/verify-rassvet/scripts/verify-rassvet.mjs cleanup
 *
 * Starts its own Vite dev server through scripts/with-app-env.mjs on
 * 127.0.0.1:4173 (override with --port). Never kills a process it did not
 * start. Cleanup removes .run/ only; evidence/ is left in place.
 */
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(SCRIPT_DIR, "..");
const REPO_ROOT = resolve(SKILL_DIR, "../../..");
const RUN_DIR = join(SKILL_DIR, ".run");
const EVIDENCE_DIR = join(SKILL_DIR, "evidence");
const PID_FILE = join(RUN_DIR, "pid");
const PORT_FILE = join(RUN_DIR, "port");
const LOG_FILE = join(RUN_DIR, "vite.log");
const URL_FILE = join(RUN_DIR, "last-url");
const PROFILE_DIR = join(RUN_DIR, "browser-profile");
const LOCK_FILE = join(RUN_DIR, "browser.lock");
const MARKER = "VERIFY_RASSVET";
const DEFAULT_PORT = 4173;
const APP_MARK = "Rassvet over Ukraine";

/** React logs this when the hydrated DOM disagrees with the client render. */
function isHydrationWarning(text) {
  return (
    /hydrat/i.test(text) &&
    /did not match|didn't match|server rendered HTML|Hydration failed/i.test(text)
  );
}

function usage() {
  return `usage:
  verify-rassvet.mjs launch [--port 4173]
  verify-rassvet.mjs doctor
  verify-rassvet.mjs cleanup
  verify-rassvet.mjs browser open <path>
  verify-rassvet.mjs browser click --role <role> --name <name> [--nth 0]
  verify-rassvet.mjs browser click --selector <css> [--nth 0]
  verify-rassvet.mjs browser select --label <label> --option <text> [--wait-text <text>]
  verify-rassvet.mjs browser fill --label <label> --value <value> [--wait-text <text>]
  verify-rassvet.mjs browser fill --role <role> --name <name> --value <value>
  verify-rassvet.mjs browser focus --role <role> --name <name>
  verify-rassvet.mjs browser press --key <key>
  verify-rassvet.mjs browser range --name <name> --value <number>
  verify-rassvet.mjs browser snapshot --aria --path <file> [--feature <id>]
  verify-rassvet.mjs browser screenshot --path <file> [--full-page] [--feature <id>]
  verify-rassvet.mjs browser url
  verify-rassvet.mjs browser text
  verify-rassvet.mjs browser section --contains <text>
  verify-rassvet.mjs browser count --selector <css>
  verify-rassvet.mjs browser expect [--text <text>] [--any <text> ...] [--absent <text>] [--url-includes <text>] [--section <text>] [--role <role> --name <name>]`;
}

function addFlag(flags, key, value) {
  if (flags[key] == null) flags[key] = value;
  else if (Array.isArray(flags[key])) flags[key].push(value);
  else flags[key] = [flags[key], value];
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith("--")) addFlag(flags, key, true);
    else {
      addFlag(flags, key, next);
      i++;
    }
  }
  return { positional, flags };
}

function flagList(flags, key) {
  if (flags[key] == null) return [];
  return [flags[key]].flat().map(String);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readProc(pid, file) {
  try {
    return readFileSync(`/proc/${pid}/${file}`);
  } catch {
    return null;
  }
}

function cmdline(pid) {
  const raw = readProc(pid, "cmdline");
  if (!raw) return "";
  return raw.toString("utf8").replaceAll("\0", " ").trim();
}

function hasMarker(pid) {
  const raw = readProc(pid, "environ");
  if (!raw) return false;
  return raw
    .toString("utf8")
    .split("\0")
    .some((entry) => entry === `${MARKER}=1`);
}

function readPid() {
  try {
    const pid = Number(readFileSync(PID_FILE, "utf8").trim());
    return Number.isInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

function readPort() {
  try {
    const port = Number(readFileSync(PORT_FILE, "utf8").trim());
    return Number.isInteger(port) ? port : null;
  } catch {
    return null;
  }
}

function origin() {
  const port = readPort() ?? DEFAULT_PORT;
  return `http://127.0.0.1:${port}`;
}

function isOurServer(pid, port) {
  if (!alive(pid)) return false;
  const line = cmdline(pid);
  return (
    hasMarker(pid) &&
    line.includes("with-app-env.mjs") &&
    line.includes("vite") &&
    line.includes(`--port ${port}`)
  );
}

function tail(path, max = 4000) {
  try {
    const text = readFileSync(path, "utf8");
    return text.slice(-max);
  } catch {
    return "";
  }
}

function emit(payload, code = 0) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

function fail(error, extra = {}) {
  emit({ ok: false, error, ...extra }, 1);
}

async function portBusy(port) {
  return new Promise((resolveBusy) => {
    const server = createServer();
    server.once("error", () => resolveBusy(true));
    server.once("listening", () => server.close(() => resolveBusy(false)));
    server.listen(port, "127.0.0.1");
  });
}

async function fetchText(url, timeoutMs) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  return { status: res.status, text };
}

async function waitReady(url, pid, timeoutMs) {
  const start = Date.now();
  let last = "no response yet";
  while (Date.now() - start < timeoutMs) {
    if (!alive(pid)) {
      throw new Error(`dev server exited before it was ready\n${tail(LOG_FILE)}`);
    }
    try {
      const { status, text } = await fetchText(url, 20_000);
      if (status === 200 && text.includes(APP_MARK)) return;
      last = `HTTP ${status}, body did not include ${APP_MARK}`;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await sleep(400);
  }
  throw new Error(`timed out waiting for ${url}: ${last}\n${tail(LOG_FILE)}`);
}

function staleOnOrbit(objects) {
  let n = 0;
  for (const obj of objects) {
    if (!obj?.stale) continue;
    if (obj.status === "raised" || obj.status === "climbing") n += 1;
  }
  return n;
}

async function readCatalog(base) {
  const { status, text } = await fetchText(`${base}/api/catalog`, 60_000);
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`GET /api/catalog returned HTTP ${status} and was not JSON`);
  }
  if (status !== 200 || !payload || !Array.isArray(payload.objects)) {
    throw new Error(`GET /api/catalog HTTP ${status} missing objects`);
  }
  if (payload.source !== "live" && payload.source !== "seed") {
    throw new Error(`catalog source ${String(payload.source)} is not live or seed`);
  }
  return {
    source: payload.source,
    fetchedAt: payload.fetchedAt ?? null,
    warning: payload.warning ?? null,
    objectCount: payload.objects.length,
    staleOnOrbit: staleOnOrbit(payload.objects),
  };
}

async function launch(flags) {
  const port = Number(flags.port ?? process.env.VERIFY_RASSVET_PORT ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) fail(`invalid port ${flags.port}`);
  if (port === 8080 || port === 8081) {
    fail(`port ${port} is reserved for the live preview (8080) or the built preview (8081)`);
  }

  const existing = readPid();
  const recordedPort = readPort();
  if (existing && recordedPort === port && isOurServer(existing, port)) {
    try {
      await waitReady(`${origin()}/`, existing, 5_000);
      emit({
        ok: true,
        alreadyRunning: true,
        pid: existing,
        port,
        url: `${origin()}/`,
        log: LOG_FILE,
      });
    } catch {
      /* fall through and refuse if the process is ours but not answering */
    }
    if (isOurServer(existing, port)) {
      fail(`verification server pid ${existing} is still alive but ${origin()}/ is not ready`, {
        pid: existing,
        port,
        log: LOG_FILE,
      });
    }
  }

  if (await portBusy(port)) {
    fail(
      `127.0.0.1:${port} is already in use by a process this harness did not start. Refusing to kill it.`,
      { port },
    );
  }

  mkdirSync(RUN_DIR, { recursive: true });
  const logFd = openSync(LOG_FILE, "w");
  const child = spawn(
    process.execPath,
    [
      "scripts/with-app-env.mjs",
      "vite",
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      cwd: REPO_ROOT,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: {
        ...process.env,
        [MARKER]: "1",
        PATH: `${join(REPO_ROOT, "node_modules", ".bin")}:${process.env.PATH ?? ""}`,
      },
    },
  );
  child.unref();
  if (!child.pid) fail("failed to spawn the dev server");
  writeFileSync(PID_FILE, `${child.pid}\n`);
  writeFileSync(PORT_FILE, `${port}\n`);

  try {
    await waitReady(`http://127.0.0.1:${port}/`, child.pid, 180_000);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err), { pid: child.pid, port, log: LOG_FILE });
  }
  emit({
    ok: true,
    alreadyRunning: false,
    pid: child.pid,
    port,
    url: `http://127.0.0.1:${port}/`,
    log: LOG_FILE,
  });
}

async function doctor() {
  const pid = readPid();
  const port = readPort();
  if (!pid || !port) fail("no verification server is recorded. Run launch first.", { pid, port });
  if (!isOurServer(pid, port)) {
    fail("recorded pid is not the verification dev server this harness started", {
      pid,
      port,
      cmdline: cmdline(pid),
      marker: hasMarker(pid),
    });
  }
  const base = `http://127.0.0.1:${port}`;
  let homeStatus = 0;
  try {
    const home = await fetchText(`${base}/`, 30_000);
    homeStatus = home.status;
    if (home.status !== 200 || !home.text.includes(APP_MARK)) {
      fail(`GET / was HTTP ${home.status} and did not include ${APP_MARK}`, { pid, port, url: `${base}/` });
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err), { pid, port });
  }
  let catalog;
  try {
    catalog = await readCatalog(base);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err), { pid, port, homeStatus });
  }
  emit({
    ok: true,
    pid,
    port,
    url: `${base}/`,
    homeStatus,
    cmdline: cmdline(pid),
    catalog,
  });
}

function killGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      /* already gone */
    }
  }
}

async function cleanup() {
  const lockPid = existsSync(LOCK_FILE) ? Number(readFileSync(LOCK_FILE, "utf8").trim()) : null;
  if (lockPid && alive(lockPid)) {
    fail(`a browser command is still running as pid ${lockPid}. Wait for it, then cleanup again.`, {
      lockPid,
    });
  }
  const pid = readPid();
  const port = readPort();
  let stopped = null;
  if (pid) {
    if (isOurServer(pid, port ?? DEFAULT_PORT)) {
      killGroup(pid, "SIGTERM");
      for (let i = 0; i < 50 && alive(pid); i++) await sleep(100);
      if (alive(pid)) killGroup(pid, "SIGKILL");
      for (let i = 0; i < 20 && alive(pid); i++) await sleep(100);
      stopped = { pid, port, alive: alive(pid) };
      if (alive(pid)) {
        fail(`failed to stop verification server pid ${pid}`, { pid, port });
      }
    } else if (alive(pid)) {
      fail("recorded pid is alive but is not the verification server. Refusing to kill it.", {
        pid,
        port,
        cmdline: cmdline(pid),
      });
    } else {
      stopped = { pid, port, alive: false, stalePidFile: true };
    }
  }
  rmSync(RUN_DIR, { recursive: true, force: true });
  emit({
    ok: true,
    stopped,
    removed: RUN_DIR,
    evidence: EVIDENCE_DIR,
    evidenceKept: true,
  });
}

function resolveTarget(raw) {
  const path = isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
  const allowed = [EVIDENCE_DIR, "/opt/cursor/artifacts", "/tmp"];
  const ok = allowed.some((root) => {
    const rel = relative(root, path);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  });
  if (!ok) {
    throw new Error(
      `refusing to write ${path}. Pass a path under ${EVIDENCE_DIR}, /opt/cursor/artifacts, or /tmp.`,
    );
  }
  return path;
}

function pageUrl(pathOrUrl) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const base = origin();
    if (!pathOrUrl.startsWith(base)) throw new Error(`refusing to open ${pathOrUrl}; it is not ${base}`);
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin()}${path}`;
}

async function withPage(fn) {
  if (!readPid() || !readPort()) fail("no verification server is recorded. Run launch and doctor first.");
  mkdirSync(RUN_DIR, { recursive: true });
  if (existsSync(LOCK_FILE)) {
    const holder = Number(readFileSync(LOCK_FILE, "utf8").trim());
    if (alive(holder)) fail(`browser lock held by pid ${holder}`);
  }
  writeFileSync(LOCK_FILE, `${process.pid}\n`);
  const consoleErrors = [];
  const hydrationWarnings = [];
  const pageErrors = [];
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") consoleErrors.push(text);
      if (isHydrationWarning(text)) hydrationWarnings.push(text);
    });
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    const result = await fn(page);
    const url = page.url();
    if (url.startsWith(origin())) writeFileSync(URL_FILE, `${url}\n`);
    return { ...result, url, consoleErrors, hydrationWarnings, pageErrors };
  } finally {
    await context.close();
    rmSync(LOCK_FILE, { force: true });
  }
}

/** SSR HTML is not interactive until React hydrates. Controls ignore input before that. */
async function waitInteractive(page) {
  await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const reactReady = (node) => Object.keys(node).some((key) => key.startsWith("__react"));
      const nodes = [document.body, ...document.querySelectorAll("button, select, a")];
      if (!nodes.some(reactReady)) return false;
      // Finish the clock inputs before a screenshot or a click. Hydration of
      // those nodes is what a caret-color write used to race.
      for (const selector of ["input.clock-range", 'input[type="datetime-local"]']) {
        const node = document.querySelector(selector);
        if (node && !reactReady(node)) return false;
      }
      return true;
    },
    null,
    { timeout: 30_000 },
  );
}

async function reopen(page) {
  let target = `${origin()}/`;
  if (existsSync(URL_FILE)) {
    const saved = readFileSync(URL_FILE, "utf8").trim();
    if (saved.startsWith(origin())) target = saved;
  }
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await waitInteractive(page);
  return target;
}

async function labelledControl(page, label) {
  const combo = page.getByRole("combobox", { name: label, exact: true });
  if ((await combo.count()) > 0) return combo.first();
  return page.getByLabel(label).first();
}

async function settle(page) {
  let previous = "";
  for (let i = 0; i < 25; i++) {
    const current = page.url();
    if (current === previous && i > 3) return;
    previous = current;
    await page.waitForTimeout(100);
  }
}

function locator(page, flags) {
  if (flags.selector) {
    const loc = page.locator(String(flags.selector));
    return flags.nth != null ? loc.nth(Number(flags.nth)) : loc.first();
  }
  if (!flags.role || !flags.name) throw new Error("pass --role and --name, or --selector");
  const loc = page.getByRole(String(flags.role), { name: String(flags.name), exact: true });
  return flags.nth != null ? loc.nth(Number(flags.nth)) : loc.first();
}

async function sectionText(page, contains) {
  const heading = page.getByText(contains, { exact: false }).first();
  await heading.waitFor({ timeout: 15_000 });
  const section = heading.locator("xpath=ancestor::section[1]");
  if ((await section.count()) > 0) return section.innerText();
  return heading.locator("xpath=..").innerText();
}

function writeNote(path, flags, url) {
  if (!flags.feature) return;
  writeFileSync(
    `${path}.json`,
    `${JSON.stringify({ feature: flags.feature, url, capturedAt: new Date().toISOString() }, null, 2)}\n`,
  );
}

async function browser(positional, flags) {
  const action = positional[0];
  if (!action) fail(usage());
  let payload;
  try {
    payload = await withPage(async (page) => {
      if (action === "open") {
        const dest = positional[1];
        if (!dest) throw new Error("browser open requires a path");
        const url = pageUrl(dest);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await waitInteractive(page);
        return { ok: true, action, opened: url };
      }

      await reopen(page);

      if (action === "click") {
        const target = locator(page, flags);
        await target.click({ timeout: 15_000 });
        if (flags["wait-text"]) {
          await page.getByText(String(flags["wait-text"]), { exact: false }).first().waitFor({ timeout: 20_000 });
        }
        await settle(page);
        return { ok: true, action };
      }

      if (action === "select") {
        if (!flags.label || !flags.option) throw new Error("select requires --label and --option");
        const control = await labelledControl(page, String(flags.label));
        await control.selectOption({ label: String(flags.option) }, { timeout: 15_000 });
        if (flags["wait-text"]) {
          await page.getByText(String(flags["wait-text"]), { exact: false }).first().waitFor({ timeout: 20_000 });
        }
        await settle(page);
        return { ok: true, action, label: flags.label, option: flags.option };
      }

      if (action === "fill") {
        const control = flags.label ? await labelledControl(page, String(flags.label)) : locator(page, flags);
        if (flags.value == null) throw new Error("fill requires --value");
        await control.fill(String(flags.value), { timeout: 15_000 });
        if (flags["wait-text"]) {
          await page.getByText(String(flags["wait-text"]), { exact: false }).first().waitFor({ timeout: 20_000 });
        }
        await settle(page);
        return { ok: true, action };
      }

      if (action === "focus") {
        await locator(page, flags).focus({ timeout: 15_000 });
        return { ok: true, action };
      }

      if (action === "press") {
        if (!flags.key) throw new Error("press requires --key");
        await page.keyboard.press(String(flags.key));
        await settle(page);
        return { ok: true, action, key: flags.key };
      }

      if (action === "range") {
        if (!flags.name || flags.value == null) throw new Error("range requires --name and --value");
        const slider = page.getByRole("slider", { name: String(flags.name), exact: true });
        await slider.fill(String(flags.value), { timeout: 15_000 });
        await slider.press("Enter");
        if (flags["wait-text"]) {
          await page.getByText(String(flags["wait-text"]), { exact: false }).first().waitFor({ timeout: 20_000 });
        }
        await settle(page);
        return { ok: true, action, name: flags.name, value: flags.value };
      }

      if (action === "snapshot") {
        if (!flags.aria) throw new Error("snapshot requires --aria");
        if (!flags.path) throw new Error("snapshot requires --path");
        const path = resolveTarget(String(flags.path));
        mkdirSync(dirname(path), { recursive: true });
        const aria = await page.locator("body").ariaSnapshot();
        const url = page.url();
        writeFileSync(path, `# ${url}\n\n${aria}\n`);
        writeNote(path, flags, url);
        return { ok: true, action, path };
      }

      if (action === "screenshot") {
        if (!flags.path) throw new Error("screenshot requires --path");
        const path = resolveTarget(String(flags.path));
        mkdirSync(dirname(path), { recursive: true });
        // Default Playwright screenshots set caret-color:transparent on every
        // input. That inline style races hydration of the clock range and the
        // datetime-local field, and React reports it as a mismatch.
        await page.screenshot({
          path,
          fullPage: Boolean(flags["full-page"]),
          caret: "initial",
        });
        const url = page.url();
        writeNote(path, flags, url);
        return { ok: true, action, path, fullPage: Boolean(flags["full-page"]) };
      }

      if (action === "url") return { ok: true, action };
      if (action === "text") return { ok: true, action, text: await page.locator("body").innerText() };

      if (action === "section") {
        if (!flags.contains) throw new Error("section requires --contains");
        return { ok: true, action, text: await sectionText(page, String(flags.contains)) };
      }

      if (action === "count") {
        if (!flags.selector) throw new Error("count requires --selector");
        return { ok: true, action, count: await page.locator(String(flags.selector)).count() };
      }

      if (action === "expect") {
        const problems = [];
        if (flags.section) {
          const text = await sectionText(page, String(flags.section));
          if (flags.text && !text.includes(String(flags.text))) {
            problems.push(`section missing ${JSON.stringify(flags.text)}`);
          }
          if (flags.absent && text.includes(String(flags.absent))) {
            problems.push(`section unexpectedly included ${JSON.stringify(flags.absent)}`);
          }
        }
        if (flags.role && flags.name) {
          const target = page.getByRole(String(flags.role), { name: String(flags.name), exact: true });
          try {
            await target.first().waitFor({ timeout: 15_000 });
          } catch {
            problems.push(`missing ${flags.role} named ${JSON.stringify(flags.name)}`);
          }
        }
        const anys = flagList(flags, "any");
        if (!flags.section) {
          if (flags.text && (await page.getByText(String(flags.text)).count()) === 0) {
            problems.push(`page missing ${JSON.stringify(flags.text)}`);
          }
          if (anys.length) {
            let found = false;
            for (const candidate of anys) {
              if ((await page.getByText(candidate).count()) > 0) found = true;
            }
            if (!found) problems.push(`page missing all of ${JSON.stringify(anys)}`);
          }
          if (flags.absent && (await page.getByText(String(flags.absent)).count()) > 0) {
            problems.push(`page unexpectedly included ${JSON.stringify(flags.absent)}`);
          }
        }
        if (flags["url-includes"] && !page.url().includes(String(flags["url-includes"]))) {
          problems.push(`url ${page.url()} missing ${JSON.stringify(flags["url-includes"])}`);
        }
        if (
          !flags.text &&
          !flags.absent &&
          !flags["url-includes"] &&
          !anys.length &&
          !flags.section &&
          !(flags.role && flags.name)
        ) {
          throw new Error("expect needs --text, --any, --absent, --url-includes, --section, or --role/--name");
        }
        if (flags.section && problems.length) {
          return { ok: false, action, problems, section: await sectionText(page, String(flags.section)) };
        }
        return problems.length
          ? { ok: false, action, problems }
          : { ok: true, action };
      }

      throw new Error(`unknown browser action ${action}\n${usage()}`);
    });
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  if (payload.pageErrors?.length || payload.hydrationWarnings?.length) payload.ok = false;
  emit(payload, payload.ok ? 0 : 1);
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const command = positional[0];

if (!command || flags.help) {
  process.stderr.write(`${usage()}\n`);
  process.exit(command ? 0 : 2);
}

if (command === "launch") await launch(flags);
else if (command === "doctor") await doctor();
else if (command === "cleanup") await cleanup();
else if (command === "browser") await browser(positional.slice(1), flags);
else fail(usage());
