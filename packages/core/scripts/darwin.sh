#!/bin/bash

# --- Configuration ---
# Specifies the directory where screenshots will be saved.
savePath="$HOME/Desktop"

# Specifies the image format (e.g., png, jpg).
imageFormat="png"
# --------------------

# Get number of screens using AppleScript
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

    # Capture using screencapture for the specific display
    screencapture -x -D $counter "$filePath"

    counter=$((counter + 1))
done