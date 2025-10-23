#!/bin/bash
set -euo pipefail

# --- Configuration ---
savePath="${SC_SAVE_PATH:-$HOME/Library/Caches/spatialshot/tmp}"
imageFormat="png"
# ---------------------

if [ -z "$savePath" ]; then
  echo "Error: savePath is empty." >&2
  exit 1
fi

if [ "$savePath" = "/" ] || [ "$savePath" = "$HOME" ]; then
    echo "Error: refusing to remove critical path: '$savePath'." >&2
    exit 1
fi

rm -rf -- "$savePath" && mkdir -p -- "$savePath" || {
  echo "Error: failed to (re)create save path '$savePath'." >&2
  exit 1
}

if ! command -v osascript &> /dev/null; then
  echo "Error: osascript not available. This script requires macOS." >&2
  exit 1
fi

num_screens=$(osascript -e 'tell application "System Events" to count desktops' 2>/dev/null)

if ! printf '%s' "$num_screens" | grep -Eq '^[0-9]+$' || [ "$num_screens" -eq 0 ]; then
  echo "Warning: couldn't detect monitor count; defaulting to 1."
  num_screens=1
fi

echo "Detected $num_screens monitor(s). Starting capture..."

counter=1
while [ "$counter" -le "$num_screens" ]; do
    fileName="$counter.$imageFormat"
    filePath="$savePath/$fileName"

    echo "-> Capturing Monitor $counter and saving to '$filePath'..."
    if ! screencapture -x -D "$counter" "$filePath"; then
        echo "Error: screencapture failed for monitor $counter." >&2
        exit 1
    fi

    counter=$((counter + 1))
done
