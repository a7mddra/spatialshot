#!/bin/bash
if [[ "$(uname)" == "Darwin" ]]; then
  # macOS
  osascript -e "set volume with output muted"
else
  # Linux
  pactl set-sink-mute @DEFAULT_SINK@ 1
fi