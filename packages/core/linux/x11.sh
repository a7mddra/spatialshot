#!/bin/bash

# --- Configuration ---
savePath="${SC_SAVE_PATH:-$HOME/.config/spatialshot/tmp}"
imageFormat="png"
# ---------------------

if ! command -v scrot &> /dev/null; then
    echo "Error: scrot is not installed. Please install it with: sudo apt install scrot"
    exit 1
fi

num_screens=$(xrandr --listmonitors | head -n 1 | awk '{print $2}')

if [ "$num_screens" -eq 0 ]; then
    echo "No monitors detected."
    exit 1
fi

echo "Detected $num_screens monitors. Starting capture..."

counter=0
while [ $counter -lt $num_screens ]; do
    fileName="$((counter + 1)).$imageFormat"
    filePath="$savePath/$fileName"

    echo "-> Capturing Monitor $((counter + 1)) and saving to '$filePath'..."
    scrot --monitor $counter "$filePath"

    counter=$((counter + 1))
done
