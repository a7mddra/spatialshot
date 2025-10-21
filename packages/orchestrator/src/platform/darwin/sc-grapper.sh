#!/bin/bash

# --- Configuration ---
savePath="${SC_SAVE_PATH:-$HOME/.config/spatialshot/tmp}"
imageFormat="png"
# ---------------------

mkdir -p "$savePath"
find "$savePath" -maxdepth 1 -type f \( -iname "*.$imageFormat" -o -iname "CAPTURE_DONE" \) -delete

num_screens=$(osascript -e 'tell application "System Events" to count desktops')

if [ "$num_screens" -eq 0 ]; then
    echo "No monitors detected."
    exit 1
fi

echo "Detected $num_screens monitors. Starting capture..."

counter=1
while [ $counter -le $num_screens ]; do
    fileName="$counter.$imageFormat"
    filePath="$savePath/$fileName"

    echo "-> Capturing Monitor $counter and saving to '$filePath'..."

    screencapture -x -D $counter "$filePath"
    counter=$((counter + 1))
done
