#!/usr/bin/env bash
# Cloud-agent bootstrap for pstack.
# Copies this repo's model rule to the path pstack reads, and installs the
# plugin into ~/.cursor/plugins/local only when no pstack install is present.
#
# The tracked rule lives at .cursor/pstack/pstack-models.mdc, not under
# .cursor/rules/, so a local Cursor window does not apply it on top of the
# home copy this script installs.
#
# Cursor's start hook can run before branch checkout. environment.json's
# start command waits for this file, then execs it. install runs after
# checkout on a snapshot build and invokes this script directly.
set -euo pipefail

LOG="${HOME}/.cursor/pstack-setup.log"
mkdir -p "$(dirname "${LOG}")"
log() {
  local line
  line="$(printf '%s %s' "$(date -Is)" "$*")"
  printf '%s\n' "${line}" >> "${LOG}"
  printf '%s\n' "${line}"
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/.cursor/pstack/pstack-models.mdc"
DEST="${HOME}/.cursor/rules/pstack-models.mdc"
PLUGIN_ROOT="${HOME}/.cursor/plugins"
LOCAL_PLUGIN="${PLUGIN_ROOT}/local/pstack"
UPSTREAM="https://github.com/cursor/plugins.git"

log "pstack setup: begin root=${ROOT}"

if [[ ! -f "${SRC}" ]]; then
  log "pstack setup: missing source rule ${SRC}"
  exit 1
fi

mkdir -p "$(dirname "${DEST}")"
if [[ -f "${DEST}" ]] && cmp -s "${SRC}" "${DEST}"; then
  log "pstack setup: model config already current at ${DEST}"
else
  cp "${SRC}" "${DEST}"
  log "pstack setup: installed model config at ${DEST}"
fi
if command -v sha256sum >/dev/null 2>&1; then
  log "pstack setup: model config sha256 $(sha256sum "${DEST}" | awk '{print $1}')"
fi

pstack_manifest=""
if [[ -d "${PLUGIN_ROOT}" ]]; then
  while IFS= read -r -d '' manifest; do
    if grep -q '"name"[[:space:]]*:[[:space:]]*"pstack"' "${manifest}"; then
      pstack_manifest="${manifest}"
      break
    fi
  done < <(find "${PLUGIN_ROOT}" -name plugin.json -print0 2>/dev/null)
fi

if [[ -n "${pstack_manifest}" ]]; then
  log "pstack setup: pstack already installed (${pstack_manifest})"
else
  log "pstack setup: pstack missing; cloning ${UPSTREAM} (pstack/) into ${LOCAL_PLUGIN}"
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT
  git clone --depth 1 --filter=blob:none --sparse "${UPSTREAM}" "${tmp}/plugins"
  git -C "${tmp}/plugins" sparse-checkout set pstack
  if [[ ! -f "${tmp}/plugins/pstack/.cursor-plugin/plugin.json" ]]; then
    log "pstack setup: clone did not contain pstack/.cursor-plugin/plugin.json"
    exit 1
  fi
  mkdir -p "${PLUGIN_ROOT}/local"
  rm -rf "${LOCAL_PLUGIN}"
  cp -a "${tmp}/plugins/pstack" "${LOCAL_PLUGIN}"
  log "pstack setup: installed pstack at ${LOCAL_PLUGIN}"
  pstack_manifest="${LOCAL_PLUGIN}/.cursor-plugin/plugin.json"
fi

echo "----- ${DEST} -----"
cat "${DEST}"
echo "----- end ${DEST} -----"
log "pstack setup: done (manifest ${pstack_manifest})"
