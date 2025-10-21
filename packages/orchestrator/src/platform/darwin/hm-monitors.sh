#!/bin/bash

count=$(osascript -e 'tell application "System Events" to return count of desktops' 2>/dev/null)

if [[ $count =~ ^[0-9]+$ ]] && [ "$count" -ge 1 ]; then
    echo "$count"
else
    echo 1
fi
