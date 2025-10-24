# ycaptool

`ycaptool` is a lightweight, standalone screenshot utility for Wayland environments, tailored for developers needing automated, multi-monitor captures.

## Features

- **Wayland-Native Capture:** Uses xdg-desktop-portal for GNOME/KDE compatibility; falls back to `grim` and `wlr-randr` for wlroots-based compositors (e.g., Sway, Hyprland).
- **Multi-Monitor Support:** Automatically detects and captures each display, saving as `1.png`, `2.png`, etc.
- **Silent Operation:** Temporarily mutes system audio to suppress shutter sounds during capture, restoring original state afterward.

## Requirements

- Qt 6 (with Core, Gui, and DBus modules)
- Wayland session
- For wlroots fallback: `grim` and `wlr-randr` installed
- Audio muting: One of `pactl` (PulseAudio), `wpctl` (PipeWire), or `amixer` (ALSA)

## Building

Ensure Qt6 development packages are installed (e.g., `sudo apt install qt6-base-dev libqt6dbus6` on Debian-based systems).

Run the build script:

```bash
./build.sh
```

This compiles the tool, installs `ycaptool` to `/dist`, and cleans up the local binary.

## Usage

Run `ycaptool` in a terminal. Screenshots are saved to `$SC_SAVE_PATH` if set, or `~/.cache/spatialshot/tmp` by default.

Example:
```bash
SC_SAVE_PATH=/tmp/screenshots ycaptool
```

Output files: `1.png`, `2.png`, etc., one per monitor. The directory is recreated fresh each run.