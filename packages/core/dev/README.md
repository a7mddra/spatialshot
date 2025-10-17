
# SpatialShot Development Core

This directory contains the core development launcher for SpatialShot.

## Development Launcher (`main.py`)

The `main.py` script is the primary entry point for developers working on SpatialShot. It automates the process of taking screenshots and launching the Electron-based capture analysis tool.

### How it Works

1.  **Environment Detection:** The script begins by identifying the user's operating system (Windows, macOS, or Linux) and display server environment (X11 or Wayland on Linux). It also detects the number of connected monitors.

2.  **Temporary Directory Management:** It creates a temporary directory to store the captured screenshots. This directory is cleared at the start of each run.
    *   **Unix-like systems (Linux, macOS):** `~/.config/spatialshot/tmp`
    *   **Windows:** `%APPDATA%\spatialshot\tmp`

3.  **Platform-Specific Capture:** Based on the detected environment, the script executes a platform-specific capture process:
    *   **Windows:** Runs the `win32.ps1` PowerShell script.
    *   **macOS:** Executes the `darwin.sh` shell script.
    *   **Linux (X11):** Executes the `x11.sh` shell script.
    *   **Linux (Wayland):** Uses the `ycaptool` binary. If multiple monitors are detected, it launches a selector UI.

4.  **Screenshot Monitoring:** After initiating the capture, the script monitors the temporary directory for the expected number of PNG images (one per monitor, or one for `ycaptool`).

5.  **Electron App Launch:** Once the screenshots are successfully captured, the script starts the Electron application located in `packages/capture` in development mode.

### Usage

To run the development launcher, simply execute the script from your terminal:

```bash
python3 main.py
```

The script handles the rest of the process, providing log output to the console for each step.
