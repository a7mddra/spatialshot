#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Emojiz"
SYMLINK_PATH="/usr/bin/${APP_NAME}"

if [ -L "$SYMLINK_PATH" ]; then
  target="$(readlink -f "$SYMLINK_PATH" 2>/dev/null || true)"
  if [ "$target" = "/opt/${APP_NAME}/${APP_NAME}" ]; then
    rm -f "$SYMLINK_PATH" 2>/dev/null || true
  fi
fi

exit 0
