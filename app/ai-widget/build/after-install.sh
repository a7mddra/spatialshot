#!/usr/bin/env bash
set -euo pipefail

# build/after-install.sh -- idempotent postinst for .deb
#  - Fix chrome-sandbox (root:root, 4755)
#  - Create /usr/bin/Emojiz symlink
#  - Ensure StartupWMClass=emojiz in .desktop file
#  - Best-effort: add GNOME custom shortcut if a user session exists

APP_NAME="Emojiz"
INSTALL_DIR="/opt/${APP_NAME}"
BIN_PATH="${INSTALL_DIR}/${APP_NAME}"
SYMLINK_PATH="/usr/bin/${APP_NAME}"
CHROME_SANDBOX="${INSTALL_DIR}/chrome-sandbox"

# Make the script executable if possible (best-effort)
SCRIPT_PATH="$(readlink -f "$0" 2>/dev/null || printf '%s' "$0")"
chmod +x "$SCRIPT_PATH" 2>/dev/null || true

# 1) Fix chrome-sandbox permissions (must be root)
if [ -f "$CHROME_SANDBOX" ]; then
  chown root:root "$CHROME_SANDBOX" 2>/dev/null || true
  chmod 4755 "$CHROME_SANDBOX" 2>/dev/null || true
fi

# 2) Create /usr/bin symlink so "Emojiz" is on PATH
if [ -x "$BIN_PATH" ]; then
  ln -sf "$BIN_PATH" "$SYMLINK_PATH" 2>/dev/null || true
  chmod +x "$BIN_PATH" 2>/dev/null || true
fi

# 3) Fix StartupWMClass in the installed .desktop file (case-insensitive search)
DESKTOP_PATH="$(find /usr/share/applications -maxdepth 1 -type f -iname '*emojiz*.desktop' | head -n1 || true)"
if [ -n "$DESKTOP_PATH" ] && [ -f "$DESKTOP_PATH" ]; then
  # If StartupWMClass exists, replace it. Otherwise append.
  if grep -qi '^StartupWMClass=' "$DESKTOP_PATH"; then
    # replace (preserve file ownership/permissions)
    sed -i 's/^StartupWMClass=.*/StartupWMClass=emojiz/I' "$DESKTOP_PATH" 2>/dev/null || true
  else
    printf '\nStartupWMClass=emojiz\n' >> "$DESKTOP_PATH" 2>/dev/null || true
  fi

  # update desktop DB if available
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q 2>/dev/null || true
  fi
fi

# 4) Best-effort: set GNOME shortcut only if a user session DBUS bus exists
# Identify target user (if installed via sudo/dpkg, SUDO_USER is usually set)
TARGET_USER="${SUDO_USER:-$(whoami)}"
TARGET_UID="$(id -u "$TARGET_USER" 2>/dev/null || echo "")"
DBUS_BUS_PATH="/run/user/${TARGET_UID}/bus"

if command -v gsettings >/dev/null 2>&1 && [ -n "$TARGET_UID" ] && [ -S "$DBUS_BUS_PATH" ]; then
  # Run gsettings as the target user and with the correct DBUS session address
  gsettings_exec() {
    sudo -u "$TARGET_USER" env DBUS_SESSION_BUS_ADDRESS="unix:path=${DBUS_BUS_PATH}" gsettings "$@"
  }

  # Build GNOME custom keybinding path (idempotent)
  SANITIZED_NAME="$(echo "$APP_NAME" | tr -cd '[:alnum:]_')"
  CUSTOM_KEY_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom_${SANITIZED_NAME}/"
  KEYBINDING_LIST_SCHEMA="org.gnome.settings-daemon.plugins.media-keys"
  KEYBINDING_LIST_KEY="custom-keybindings"
  INDIVIDUAL_KEY_SCHEMA="org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:${CUSTOM_KEY_PATH}"

  # Read current bindings (best-effort)
  current_bindings="$(gsettings_exec get "$KEYBINDING_LIST_SCHEMA" "$KEYBINDING_LIST_KEY" 2>/dev/null || echo "@as []")"
  if [[ "$current_bindings" != *"$CUSTOM_KEY_PATH"* ]]; then
    if [[ "$current_bindings" == "@as []" || "$current_bindings" == "[]" ]]; then
      new_bindings="['$CUSTOM_KEY_PATH']"
    else
      new_bindings="${current_bindings%]*}, '$CUSTOM_KEY_PATH']"
    fi
    gsettings_exec set "$KEYBINDING_LIST_SCHEMA" "$KEYBINDING_LIST_KEY" "$new_bindings" 2>/dev/null || true
  fi

  # Set the individual values (name, command, binding)
  gsettings_exec set "$INDIVIDUAL_KEY_SCHEMA" name "Launch ${APP_NAME}" 2>/dev/null || true
  gsettings_exec set "$INDIVIDUAL_KEY_SCHEMA" command "${APP_NAME}" 2>/dev/null || true
  gsettings_exec set "$INDIVIDUAL_KEY_SCHEMA" binding "<Control>semicolon" 2>/dev/null || true
fi

# Done — exit 0 so dpkg considers install successful
exit 0
