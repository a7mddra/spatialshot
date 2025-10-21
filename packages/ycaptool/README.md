# ycaptool

`ycaptool` is a screenshot utility for Wayland designed for developers. It leverages the Flameshot binary to provide a programmatic way to capture screenshots.

## Features

*   **Wayland Screenshot Capture:** Automates the process of taking screenshots in a Wayland session.
*   **Multi-display Support:** A GTK-based GUI allows you to select a specific display for capture in multi-monitor setups.
*   **Silent Operation:** System sounds are temporarily muted during capture to suppress the shutter sound.
*   **Flameshot Integration:** Uses the powerful Flameshot tool for the actual screen capture.

## Components

The tool is a standalone C++ and GTK-based application, `ycaptool`. It intelligently detects when multiple displays are present and shows a selector GUI. For single-display setups, it proceeds to capture immediately. It bundles the `flameshot` binary, which it uses for the actual screen capture process.

## Building

To build the `ycaptool` binary, run the `build.sh` script:

```bash
./build.sh
```

This will produce the `ycaptool` binary in the `bin` directory.
