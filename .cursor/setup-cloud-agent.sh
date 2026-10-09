#!/usr/bin/env bash
# Cloud-agent bootstrap for pstack.
# Copies this repo's model rule to the path pstack reads, and installs the
# plugin into ~/.cursor/plugins/local only when no pstack install is present.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/.cursor/rules/pstack-models.mdc"
DEST="${HOME}/.cursor/rules/pstack-models.mdc"
PLUGIN_ROOT="${HOME}/.cursor/plugins"
LOCAL_PLUGIN="${PLUGIN_ROOT}/local/pstack"
UPSTREAM="https://github.com/cursor/plugins.git"

if [[ ! -f "${SRC}" ]]; then
  echo "pstack setup: missing source rule ${SRC}" >&2
  exit 1
fi

mkdir -p "$(dirname "${DEST}")"
if [[ -f "${DEST}" ]] && cmp -s "${SRC}" "${DEST}"; then
  echo "pstack setup: model config already current at ${DEST}"
else
  cp "${SRC}" "${DEST}"
  echo "pstack setup: installed model config at ${DEST}"
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
  echo "pstack setup: pstack already installed (${pstack_manifest})"
else
  echo "pstack setup: pstack missing; cloning ${UPSTREAM} (pstack/) into ${LOCAL_PLUGIN}"
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT
  git clone --depth 1 --filter=blob:none --sparse "${UPSTREAM}" "${tmp}/plugins"
  git -C "${tmp}/plugins" sparse-checkout set pstack
  if [[ ! -f "${tmp}/plugins/pstack/.cursor-plugin/plugin.json" ]]; then
    echo "pstack setup: clone did not contain pstack/.cursor-plugin/plugin.json" >&2
    exit 1
  fi
  mkdir -p "${PLUGIN_ROOT}/local"
  rm -rf "${LOCAL_PLUGIN}"
  cp -a "${tmp}/plugins/pstack" "${LOCAL_PLUGIN}"
  echo "pstack setup: installed pstack at ${LOCAL_PLUGIN}"
  pstack_manifest="${LOCAL_PLUGIN}/.cursor-plugin/plugin.json"
fi

echo "----- ${DEST} -----"
cat "${DEST}"
echo "----- end ${DEST} -----"
echo "pstack setup: done (manifest ${pstack_manifest})"
