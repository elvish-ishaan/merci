#!/usr/bin/env bash
# Usage: ./zip.sh <example-folder>
# Produces <example-folder>.zip in the current directory, ready to upload to Mercio.
#
# Example:
#   ./zip.sh hello-world     → hello-world.zip
#   ./zip.sh with-deps       → with-deps.zip

set -e

FOLDER="${1:?Usage: ./zip.sh <example-folder>}"

if [ ! -d "$FOLDER" ]; then
  echo "Error: directory '$FOLDER' not found" >&2
  exit 1
fi

OUT="${FOLDER}.zip"
rm -f "$OUT"

(cd "$FOLDER" && zip -r "../$OUT" . --exclude "node_modules/*" --exclude "*.zip")

echo "Created: $OUT"
echo ""
echo "Upload with:"
echo "  curl -X POST http://localhost:3001/api/mercio/upload \\"
echo "    -H 'Authorization: Bearer <your-jwt>' \\"
echo "    -F 'zip=@${OUT}' \\"
echo "    -F 'name=${FOLDER}' \\"
echo "    -F 'entry=index.js'"
