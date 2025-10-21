#!/bin/bash

probe_xrandr() {
    if command -v xrandr >/dev/null 2>&1; then
        output=$(xrandr --listmonitors 2>/dev/null)
        if [ $? -eq 0 ]; then
            first_line=$(echo "$output" | head -n 1)
            if [[ $first_line == *"Monitors:"* ]]; then
                count=$(echo "$first_line" | awk '{print $2}')
                if [[ $count =~ ^[0-9]+$ ]] && [ "$count" -ge 1 ]; then
                    echo "$count"
                    return 0
                fi
            fi
        fi
    fi
    return 1
}

probe_drm_sysfs() {
    count=0
    for status_file in /sys/class/drm/*/status; do
        if [ -f "$status_file" ]; then
            status=$(cat "$status_file" 2>/dev/null | tr -d '[:space:]')
            if [ "$status" = "connected" ]; then
                count=$((count + 1))
            fi
        fi
    done
    if [ "$count" -ge 1 ]; then
        echo "$count"
        return 0
    fi
    return 1
}

probe_xrandr || probe_drm_sysfs || echo 1
