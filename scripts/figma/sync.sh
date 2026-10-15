#!/usr/bin/env bash
# ดึงเฟรม "K Sure UI v3-final" จาก Figma แล้วสร้าง docs/design/figma-spec/ ใหม่
# ต้องมี Personal Access Token ใน ~/.figma_token (scope: File content read-only)
set -euo pipefail
FILE_KEY="KLFeKqPDsAOhGLcbfrjT7N"
NODE_ID="29:2"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -sf -H "X-Figma-Token: $(cat ~/.figma_token)" \
  "https://api.figma.com/v1/files/${FILE_KEY}/nodes?ids=${NODE_ID}&geometry=paths" -o "$TMP/final.json"
python3 -I "$ROOT/scripts/figma/extract_spec.py" "$TMP/final.json" "$ROOT/docs/design/figma-spec"
