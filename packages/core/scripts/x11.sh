#!/bin/bash

# --- Configuration ---
# Specifies the directory where screenshots will be saved.
savePath="$HOME/Desktop"

# Specifies the image format (e.g., png, jpg).
imageFormat="png"
# --------------------

# Check if scrot is installed
if ! command -v scrot &> /dev/null; then
    echo "Error: scrot is not installed. Please install it with: sudo apt install scrot"
    exit 1
fi

# Get number of screens using xrandr
num_screens=$(xrandr --listmonitors | head -n 1 | awk '{print $2}')

if [ "$num_screens" -eq 0 ]; then
    echo "No monitors detected."
    exit 1
fi

echo "Detected $num_screens monitors. Starting capture..."

counter=0  # scrot uses 0-based indexing for monitors
while [ $counter -lt $num_screens ]; do
    fileName="$((counter + 1)).$imageFormat"  # Use 1-based for filenames
    filePath="$savePath/$fileName"

    echo "-> Capturing Monitor $((counter + 1)) and saving to '$filePath'..."

    # Capture using scrot for the specific display (0-based index)
    scrot --monitor $counter "$filePath"

    counter=$((counter + 1))
done

echo "All screenshots have been successfully saved to your desktop."
