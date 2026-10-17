#!/usr/bin/env bash
set -euo pipefail
FILE_KEY="KLFeKqPDsAOhGLcbfrjT7N"
NODE_ID="29:2"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -sf -H "X-Figma-Token: $(cat ~/.figma_token)" \
  "https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${NODE_ID}&geometry=paths" -o "$TMP/final.json"
python3 -I "$ROOT/scripts/figma/extract_spec.py" "$TMP/final.json" "$ROOT/docs/design/figma-spec"
