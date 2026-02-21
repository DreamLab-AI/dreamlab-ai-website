#!/bin/sh
set -e
BASE_URL="${JSS_BASE_URL:-http://localhost:8080/}"
exec community-solid-server \
  --port 8080 \
  --baseUrl "$BASE_URL" \
  --config @css:config/file-no-setup.json \
  --loggingLevel warn \
  --rootFilePath /data/pods \
  --showStackTrace false
