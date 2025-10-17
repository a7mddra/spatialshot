# ycaptool

`ycaptool` is a screenshot utility for Wayland designed for developers. It leverages the Flameshot binary to provide a programmatic way to capture screenshots.

## Features

*   **Wayland Screenshot Capture:** Automates the process of taking screenshots in a Wayland session.
*   **Multi-display Support:** A GTK-based GUI allows you to select a specific display for capture in multi-monitor setups.
*   **Silent Operation:** System sounds are temporarily muted during capture to suppress the shutter sound.
*   **Flameshot Integration:** Uses the powerful Flameshot tool for the actual screen capture.

## Components

The tool is composed of two main parts:

1.  **`ycap-cli` (CLI Tool):** A Python-based command-line tool, packaged with PyInstaller, that handles the backend logic of taking the screenshot. It bundles a version of the Flameshot binary.
2.  **`ycaptool` (GUI):** A C++ and GTK-based graphical interface that appears when multiple displays are detected, allowing the user to choose which screen to capture.

## Building

To build both the CLI and GUI components, run the `build.sh` script:

```bash
./build.sh # --help
```

This will produce the `ycaptool` and `ycap-cli` binaries in the `bin` directory.
