#!/bin/bash
set -euo pipefail

# --- Configuration ---
savePath="${SC_SAVE_PATH:-${XDG_CACHE_HOME:-$HOME/.cache}/spatialshot/tmp}"
imageFormat="png"
# ---------------------

if [ -z "$savePath" ]; then
  echo "Error: savePath is empty." >&2
  exit 1
fi

if [[ "$savePath" == "/" || "$savePath" == "$HOME" ]]; then
    echo "Error: refusing to remove critical path: '$savePath'." >&2
    exit 1
fi

rm -rf -- "$savePath" && mkdir -p -- "$savePath" || {
  echo "Error: failed to (re)create save path '$savePath'." >&2
  exit 1
}

# session detection
if [ "${XDG_SESSION_TYPE:-}" = "wayland" ]; then
    session="wayland"
elif [ "${XDG_SESSION_TYPE:-}" = "x11" ]; then
    session="x11"
elif [ -n "${WAYLAND_DISPLAY:-}" ]; then
    session="wayland"
elif [ -n "${DISPLAY:-}" ]; then
    session="x11"
else
    session="unknown"
fi

# Wayland
if [ "$session" = "wayland" ]; then
    echo "Wayland session detected — using ycaptool..."
    ycaptool_fallback="${XDG_DATA_HOME:-$HOME/.local/share}/spatialshot/bin/ycaptool"
    if command -v ycaptool &> /dev/null; then
        exec ycaptool # <-- FIX: Added exec
    elif [ -x "$ycaptool_fallback" ]; then
        exec "$ycaptool_fallback" # <-- FIX: Added exec
    else
        echo "Error: ycaptool not found in PATH or at '$ycaptool_fallback'." >&2
        exit 1
    fi
    exit $?
fi

# X11
if ! command -v scrot &> /dev/null; then
    echo "Error: scrot is not installed. Please install it (e.g. sudo apt install scrot)." >&2
    exit 1
fi

if command -v xrandr &> /dev/null; then
    num_screens=$(xrandr --listmonitors 2>/dev/null | head -n1 | awk '{print $2}')
else
    num_screens=1
fi

if ! printf '%s' "$num_screens" | grep -Eq '^[0-9]+$' || [ "$num_screens" -eq 0 ]; then
    num_screens=1
fi

echo "Detected $num_screens monitor(s). Starting capture..."

for ((i=0; i<num_screens; i++)); do
    fileName="$((i + 1)).$imageFormat"
    filePath="$savePath/$fileName"
    echo "-> Capturing Monitor $((i + 1)) and saving to '$filePath'..."
    if ! scrot --monitor "$i" "$filePath"; then
        echo "Error: scrot failed for monitor $i." >&2
        exit 1
    fi
done
