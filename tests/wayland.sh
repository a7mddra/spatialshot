#!/usr/bin/env bash
# @file      wayland.sh
# @brief     A test script to verify screen capture functionality for a specific monitor under Wayland.
# @details   This script is designed to test if a screen capture tool (flameshot) can successfully
#            target and capture a single, specified display in a multi-monitor Wayland session.
#            It includes logic to temporarily mute system audio to prevent shutter sounds and
#            provides a fallback test to see if a full-screen capture works when a targeted
#            capture fails.
# @author    A7MDDRA
# @date      2025-10-14

# --- Script Configuration and Initialization ---
# Enforce strict error handling.
# -e: Exit immediately if a command exits with a non-zero status.
# -u: Treat unset variables as an error when substituting.
# -o pipefail: The return value of a pipeline is the status of the last command to exit with a non-zero status.
set -euo pipefail

# --- Argument Parsing ---
# Check if a display number was provided as a command-line argument.
if [ $# -eq 0 ]; then
    echo "Usage: $0 <display-number>"
    echo "Example: $0 1 => will attempt to save a screenshot of display 1."
    exit 1
fi

## @var DISPLAY_NUM
# @brief The 1-based index of the display to capture, provided by the user.
DISPLAY_NUM="$1"

## @var SAVE_PATH
# @brief The directory where the screenshot will be saved.
# @details Defaults to the user's Desktop if the SC_SAVE_PATH environment variable is not set.
SAVE_PATH="${SC_SAVE_PATH:-$HOME/Desktop}"

## @var IMAGE_FMT
# @brief The image format for the output file.
IMAGE_FMT="png"

# Ensure the save directory exists.
mkdir -p "$SAVE_PATH"

## @var OUTPUT_FILE
# @brief The full path for the final screenshot image.
OUTPUT_FILE="$SAVE_PATH/${DISPLAY_NUM}.${IMAGE_FMT}"


# --- Helper Functions ---

## @fn log()
# @brief Prints a formatted log message to standard output.
# @param $* The message to be printed.
log(){ printf '%s\n' "$*"; }

## @fn has()
# @brief Checks if a given command is available in the system's PATH.
# @param $1 The name of the command to check.
# @return 0 if the command exists, 1 otherwise.
has(){ command -v "$1" >/dev/null 2>&1 || false; }


# --- Audio Mute/Restore ---
# @brief This section handles the temporary muting of system audio to prevent
#        the screenshot shutter sound from being audible during the test.
#        It attempts to use pactl, wpctl, or amixer, whichever is available.

## @var AUDIO_BACKEND
# @brief Stores which audio utility ('pactl', 'wpctl', 'amixer') was used to mute the audio.
AUDIO_BACKEND=""
## @var PREV_MUTE
# @brief Stores the original mute state of the audio sink before the script runs.
PREV_MUTE=""
## @var AUDIO_MUTED_BY_SCRIPT
# @brief A flag (0 or 1) to indicate if this script was the one that muted the audio.
AUDIO_MUTED_BY_SCRIPT=0

## @fn mute_audio()
# @brief Mutes the default system audio sink if it is not already muted.
# @details It detects and uses the first available audio control utility from a predefined list.
mute_audio() {
  if has pactl; then
    AUDIO_BACKEND="pactl"
    PREV_MUTE=$(pactl get-sink-mute @DEFAULT_SINK@ 2>/dev/null | awk '{print $2}' || echo "unknown")
    if [ "$PREV_MUTE" != "yes" ]; then
      pactl set-sink-mute @DEFAULT_SINK@ 1 2>/dev/null || true
      AUDIO_MUTED_BY_SCRIPT=1
    fi
    return
  fi

  if has wpctl; then
    AUDIO_BACKEND="wpctl"
    PREV_MUTE=$(wpctl get-mute @DEFAULT_SINK@ 2>/dev/null || echo "unknown")
    if [ "$PREV_MUTE" != "true" ]; then
      wpctl set-mute @DEFAULT_SINK@ true 2>/dev/null || true
      AUDIO_MUTED_BY_SCRIPT=1
    fi
    return
  fi

  if has amixer; then
    AUDIO_BACKEND="amixer"
    PREV_MUTE=$(amixer get Master 2>/dev/null | grep -o '\[on\]\|\[off\]' | head -n1 | tr -d '[]' || echo "unknown")
    if [ "$PREV_MUTE" = "on" ]; then
      amixer set Master mute >/dev/null 2>&1 || true
      AUDIO_MUTED_BY_SCRIPT=1
    fi
    return
  fi
}

## @fn restore_audio()
# @brief Restores the audio to its original state if it was muted by this script.
restore_audio() {
  if [ "${AUDIO_MUTED_BY_SCRIPT:-0}" -ne 1 ]; then
    return # Do nothing if we didn't mute the audio.
  fi
  case "$AUDIO_BACKEND" in
    pactl)
      if [ "$PREV_MUTE" != "yes" ]; then
        pactl set-sink-mute @DEFAULT_SINK@ 0 2>/dev/null || true
      fi
      ;;
    wpctl)
      if [ "$PREV_MUTE" != "true" ]; then
        wpctl set-mute @DEFAULT_SINK@ false 2>/dev/null || true
      fi
      ;;
    amixer)
      if [ "$PREV_MUTE" = "on" ]; then
        amixer set Master unmute >/dev/null 2>&1 || true
      fi
      ;;
  esac
}

# Set a trap to ensure restore_audio is called on script exit, interruption, or termination.
trap restore_audio EXIT INT TERM

# Mute audio before taking the screenshot.
mute_audio


# --- Environment Sanity Checks ---

## @fn is_wayland()
# @brief Determines if the current user session is running under Wayland.
# @return 0 if Wayland is detected, 1 otherwise.
is_wayland() {
  [ "${XDG_SESSION_TYPE:-}" = "wayland" ] || [ -n "${WAYLAND_DISPLAY:-}" ]
}

# Terminate if the script is not running in a Wayland session, as flameshot's
# screen selection relies on Wayland-specific protocols.
if ! is_wayland; then
  echo "Error: This script is designed for Wayland sessions only. Exiting."
  exit 1
fi


# --- Main Capture Logic ---
# @brief This section performs the primary action of capturing the specified display.

# Check for the required dependency, flameshot.
if ! has flameshot; then
  echo "Error: flameshot is not installed or not found in PATH."
  exit 1
fi

## @var FLAMESHOT_INDEX
# @brief The 0-based index for the display, as required by flameshot.
FLAMESHOT_INDEX=$((DISPLAY_NUM - 1))

log "Capturing display $DISPLAY_NUM (flameshot index: $FLAMESHOT_INDEX) to $OUTPUT_FILE"

# Attempt to capture the specific screen using its 0-based index.
if flameshot screen -n "$FLAMESHOT_INDEX" --path "$OUTPUT_FILE" >/dev/null 2>&1; then
    log "Successfully saved screenshot to: $OUTPUT_FILE"
else
    # If capturing a specific screen fails, it indicates a potential issue with
    # flameshot's ability to enumerate or access individual outputs in Wayland.
    log "Error: Failed to capture display $DISPLAY_NUM with flameshot."
    log "This may indicate an issue with monitor detection in your Wayland compositor."

    # As a fallback, attempt to capture the entire desktop to verify if flameshot
    # works at a basic level. This helps differentiate between a total failure and
    # a screen-targeting-specific failure.
    log "Attempting a fallback full-screen capture for diagnostic purposes..."
    TEMP_FILE="/tmp/screenshot_fallback.$IMAGE_FMT"
    if flameshot full --path "$TEMP_FILE" >/dev/null 2>&1; then
        log "Fallback Succeeded: A full-screen screenshot was saved to $TEMP_FILE."
        log "This confirms flameshot works, but targeting individual displays failed."
        rm "$TEMP_FILE"
    else
        log "Fallback Failed: Could not capture a full-screen screenshot either."
    fi
    exit 1
fi
