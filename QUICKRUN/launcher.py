#!/usr/bin/env python3

"""
                       ♦ SpatialShot Development Launcher ♦

        This script is the primary entry point for developers, designed to simulate
                    and test the complete application workflow.

       It orchestrates the platform-specific screen capture, the C++/Qt drawing
          interface, and the final Electron UI panel. This facilitates rapid
  development and integration testing without requiring the final Rust orchestrator.

          NOTE: Required binaries must first be compiled by running setup.py.
"""

from __future__ import annotations

import os
import platform
import subprocess
import glob
import ctypes
import logging
import shutil
import sys
import time
import re
from ctypes import byref, c_uint32
from pathlib import Path
from typing import Optional, List, Tuple

# --- Constants and Path Setup ---
HOME = Path.home()
SCRIPT_PATH = Path(__file__).resolve()
DIR_PATH = SCRIPT_PATH.parent
PRJKT_ROOT = DIR_PATH.parent
PKGS_PATH = PRJKT_ROOT / "packages"
PLATFORM_PATH = PRJKT_ROOT / "platform"

# Temporary directory paths
TMP_PATH_UNIX = HOME / ".config" / "spatialshot" / "tmp"
TMP_PATH_WIN = HOME / "AppData" / "Roaming" / "spatialshot" / "tmp"

# Binary and Script Paths
YCAP_BINARY = PKGS_PATH / "ycaptool" / "bin" / "ycaptool"
SQUIGGLE_BINARY_EXT = ".exe" if platform.system() == "Windows" else ""
SQUIGGLE_BINARY_NAME = f"spatialshot-squiggle{SQUIGGLE_BINARY_EXT}"
SQUIGGLE_BINARY = PKGS_PATH / "squiggle" / "dist" / SQUIGGLE_BINARY_NAME
ELECTRON_NODE = PKGS_PATH / "spatialshot"
SCRIPT_WIN = PLATFORM_PATH / "win32" / "sc-grapper.ps1"
SCRIPT_MAC = PLATFORM_PATH / "darwin" / "sc-grapper.sh"
SCRIPT_X11 = PLATFORM_PATH / "linux" / "sc-grapper.sh"

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] (%(name)s) %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("spatialshot.dev")


# --- Environment Detection ---
def identify_display_environment() -> str:
    """
    Identifies the host OS and display server.

    Returns:
        str: One of "win32", "darwin", "wayland", "x11", or "unknown".
    """
    system_name = platform.system().lower()
    if system_name == "windows":
        return "win32"
    if system_name == "darwin":
        return "darwin"
    if system_name == "linux":
        xdg = os.environ.get("XDG_SESSION_TYPE", "").lower()
        if os.environ.get("WAYLAND_DISPLAY") or xdg == "wayland":
            return "wayland"
        if os.environ.get("DISPLAY") or xdg == "x11":
            return "x11"
        logger.warning("Unknown Linux display environment. Falling back to x11.")
        return "x11"
    return "unknown"


def _probe_gdk() -> Optional[int]:
    """Tries to get monitor count using GDK (Linux)."""
    try:
        import gi  # type: ignore
        try:
            gi.require_version("Gtk", "3.0")
            gi.require_version("Gdk", "3.0")
        except Exception:
            pass
        from gi.repository import Gdk, Gtk  # type: ignore

        if hasattr(Gtk, "init_check"): Gtk.init_check()
        disp = Gdk.Display.get_default()
        if disp:
            n = disp.get_n_monitors()
            if isinstance(n, int) and n > 0:
                return int(n)
        screen = Gdk.Screen.get_default()
        if screen:
            n = screen.get_n_monitors()
            if isinstance(n, int) and n > 0:
                return int(n)
    except Exception:
        return None
    return None


def _probe_xrandr() -> Optional[int]:
    """Tries to get monitor count using xrandr (Linux/X11)."""
    try:
        out = subprocess.check_output(
            ["xrandr", "--listmonitors"],
            stderr=subprocess.DEVNULL, text=True
        )
        first = out.splitlines()[0].strip()
        if first.lower().startswith("monitors:"):
            parts = first.split()
            if len(parts) >= 2 and parts[1].isdigit():
                return int(parts[1])
    except Exception:
        pass
    return None


def _probe_drm_sysfs() -> Optional[int]:
    """Tries to get monitor count via sysfs (Linux)."""
    try:
        paths = glob.glob("/sys/class/drm/*/status")
        count = 0
        for p in paths:
            try:
                with open(p, "r") as fh:
                    if fh.read().strip() == "connected":
                        count += 1
            except Exception:
                continue
        if count > 0:
            return count
    except Exception:
        pass
    return None


def _probe_windows() -> Optional[int]:
    """Tries to get monitor count using GetSystemMetrics (Windows)."""
    try:
        user32 = ctypes.windll.user32
        n = user32.GetSystemMetrics(80)  # SM_CMONITORS
        if n >= 1:
            return int(n)
    except Exception:
        pass
    return None


def _probe_macos() -> Optional[int]:
    """Tries to get monitor count using AppKit or CoreGraphics (macOS)."""
    try:
        from AppKit import NSScreen  # type: ignore
        return len(NSScreen.screens())
    except Exception:
        pass
    try:
        cg = ctypes.CDLL("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics")
        max_displays = 32
        displays = (c_uint32 * max_displays)()
        display_count = c_uint32(0)
        res = cg.CGGetActiveDisplayList(max_displays, displays, byref(display_count))
        if res == 0:
            return int(display_count.value)
    except Exception:
        pass
    return None


def probe_monitor_count() -> int:
    """
    Probes the system for the number of connected monitors.

    Returns:
        int: The number of detected monitors (defaults to 1).
    """
    system_name = platform.system().lower()
    n = None

    if system_name == "windows":
        n = _probe_windows()
    elif system_name == "darwin":
        n = _probe_macos()
    elif system_name == "linux":
        n = _probe_gdk()
        if not n or n < 1:
            n = _probe_xrandr()
        if not n or n < 1:
            n = _probe_drm_sysfs()

    return n if n is not None and n >= 1 else 1


# --- Core Utility Functions ---
def _run_process(
    command: List[str],
    cwd: Optional[Path] = None
) -> Tuple[bool, str, str]:
    """
    Runs a subprocess and logs its execution.

    Args:
        command: The command and arguments to run.
        cwd: The working directory to run in.

    Returns:
        A tuple of (success, stdout, stderr).
    """
    cmd_str = " ".join(f'"{c}"' if " " in c else c for c in command)
    logger.debug("Running command: %s", cmd_str)
    try:
        process = subprocess.run(
            command,
            cwd=str(cwd) if cwd is not None else None,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        if process.stdout:
            logger.debug("Command stdout: %s", process.stdout.strip())
        if process.stderr:
            logger.debug("Command stderr: %s", process.stderr.strip())
        logger.info("Command succeeded: %s", command[0])
        return True, process.stdout, process.stderr
    except subprocess.CalledProcessError as exc:
        logger.error("Command failed (rc=%d): %s", exc.returncode, command[0])
        if exc.stdout:
            logger.error("STDOUT: %s", exc.stdout.strip())
        if exc.stderr:
            logger.error("STDERR: %s", exc.stderr.strip())
        return False, exc.stdout, exc.stderr
    except FileNotFoundError:
        logger.error("Command not found: %s", command[0])
        return False, "", "File not found"


def clear_tmp() -> Path:
    """
    Clears and recreates the temporary directory for this run.

    Returns:
        Path: The path to the clean temporary directory.
    """
    tmp = TMP_PATH_WIN if sys.platform == "win32" else TMP_PATH_UNIX
    if tmp.exists():
        try:
            shutil.rmtree(tmp)
            logger.info("Removed existing tmp directory: %s", tmp)
        except Exception as exc:
            logger.warning("Could not remove tmp directory %s: %s", tmp, exc)
    try:
        tmp.mkdir(parents=True, exist_ok=True)
        logger.info("Created clean tmp directory: %s", tmp)
    except Exception as exc:
        logger.error("Failed to create tmp directory %s: %s", tmp, exc)
        raise
    return tmp


def wait_for_file(file_path: Path, timeout_sec: int = 5) -> bool:
    """
    Waits for a specific file to be created.

    Args:
        file_path: The file to watch for.
        timeout_sec: Maximum time to wait.

    Returns:
        True if the file was found, False if it timed out.
    """
    start_time = time.time()
    logger.info("Waiting for file: %s", file_path.name)
    while not file_path.exists():
        if time.time() - start_time > timeout_sec:
            logger.error("Timeout: File not found after %d sec", timeout_sec)
            return False
        time.sleep(0.1)
    logger.info("File found: %s", file_path.name)
    return True


# --- Application Lifecycle Functions ---

def run_screenshot_capture(
    env: str,
    tmp_path: Path,
    monitor_count: int
) -> Tuple[bool, int]:
    """
    Runs the native screenshot script for the current platform.

    Args:
        env: The detected environment (e.g., "win32", "x11").
        tmp_path: The temporary directory to store screenshots.
        monitor_count: The number of monitors detected.

    Returns:
        A tuple of (success, expected_png_count).
    """
    if env == "win32":
        logger.info("Initiating capture: Windows")
        if not SCRIPT_WIN.exists():
            logger.error("Windows capture script missing: %s", SCRIPT_WIN)
            return False, 0
        success, _, _ = _run_process(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(SCRIPT_WIN)]
        )
        return success, monitor_count

    elif env == "darwin":
        logger.info("Initiating capture: macOS")
        if not SCRIPT_MAC.exists():
            logger.error("macOS capture script missing: %s", SCRIPT_MAC)
            return False, 0
        success, _, _ = _run_process(["bash", str(SCRIPT_MAC)])
        return success, monitor_count

    elif env == "x11":
        logger.info("Initiating capture: Linux (X11)")
        if not SCRIPT_X11.exists():
            logger.error("X11 capture script missing: %s", SCRIPT_X11)
            return False, 0
        success, _, _ = _run_process(["bash", str(SCRIPT_X11)])
        return success, monitor_count

    elif env == "wayland":
        logger.info("Initiating capture: Linux (Wayland)")
        if not YCAP_BINARY.exists():
            logger.error("ycaptool binary not found: %s", YCAP_BINARY)
            logger.info("Build ycaptool: cd packages/ycaptool && ./build.sh")
            return False, 0

        if monitor_count > 1:
            logger.info("Multiple monitors detected. Launching selector...")
            success, _, _ = _run_process([str(YCAP_BINARY), "--multi"])
            return success, 1  # --multi always results in one screenshot
        else:
            logger.info("Single monitor detected. Launching direct capture.")
            success, _, _ = _run_process([str(YCAP_BINARY)])
            return success, 1
    
    logger.error("Unsupported environment: %s", env)
    return False, 0


def launch_squiggle(
    tmp_path: Path,
    monitor_num: Optional[int]
) -> Optional[Path]:
    """
    Launches the Squiggle (C++/Qt) application.

    After Squiggle exits, this function looks for "output.png".

    Args:
        tmp_path: The temporary directory where screenshots exist.
        monitor_num: For Wayland, the specific monitor to open on.

    Returns:
        The Path to "output.png" if successful, else None.
    """
    if not SQUIGGLE_BINARY.exists():
        logger.error("Squiggle binary not found: %s", SQUIGGLE_BINARY)
        logger.info("Build Squiggle: cd packages/squiggle && python3 build.py --install")
        return None

    logger.info("Launching Squiggle...")
    command = [str(SQUIGGLE_BINARY)]
    if monitor_num is not None:
        logger.info("Telling Squiggle to focus on monitor %d", monitor_num)
        command.extend(["--", str(monitor_num)])

    success, _, _ = _run_process(command)
    if not success:
        logger.error("Squiggle application failed or was cancelled.")
        return None

    # Squiggle has finished, look for its output
    output_png = tmp_path / "output.png"
    if not wait_for_file(output_png, timeout_sec=2):
        logger.error("Squiggle ran but did not produce output.png")
        return None

    return output_png


def launch_electron(output_png: Path) -> bool:
    """
    Launches the Electron application in development mode.
    Checks for compiled CSS and builds it if missing.

    Args:
        output_png: The path to the final cropped image.

    Returns:
        True if the process started successfully, else False.
    """
    if not ELECTRON_NODE.exists() or not (ELECTRON_NODE / "package.json").exists():
        logger.error("Electron project not found: %s", ELECTRON_NODE)
        logger.info("Run: cd packages/spatialshot && npm install")
        return False

    # --- CSS Check ---
    welcome_css = ELECTRON_NODE / "pages" / "welcome" / "style.css"
    if not welcome_css.exists():
        logger.info("Welcome CSS not found. Running one-time Sass build...")
        build_command = ["npm", "run", "build:css"]
        try:
            success, _, err = _run_process(build_command, cwd=ELECTRON_NODE)
            if not success:
                logger.error("Sass build failed. See logs.")
                logger.error(err)
                return False
            
            if not welcome_css.exists():
                logger.error("Sass build ran but output file is still missing: %s", welcome_css)
                return False
                
            logger.info("Sass build complete.")
        except Exception as exc:
            logger.error("Failed to run Sass build command: %s", exc)
            return False
    # --- End CSS Check ---

    logger.info("Starting Electron (npm start) for: %s", output_png.name)
    
    # We pass the image path as an argument to 'npm start'
    command = ["npm", "start", "--", str(output_png)]
    
    try:
        subprocess.Popen(command, cwd=ELECTRON_NODE)
        logger.info("Electron launched successfully.")
        return True
    except Exception as exc:
        logger.error("Failed to start Electron process: %s", exc)
        return False


# --- Main Orchestrator ---
def main() -> None:
    """
    Main function to run the complete development flow.
    """
    logger.info("--- SpatialShot Development Launcher Started ---")
    
    # 1. Detect environment
    env = identify_display_environment()
    if env == "unknown":
        logger.error("Unsupported operating system: %s", platform.system())
        sys.exit(1)
        
    monitors = probe_monitor_count()
    logger.info("Detected: %s with %d monitor(s)", env.upper(), monitors)

    # 2. Clear temp directory
    try:
        tmp_path = clear_tmp()
    except Exception:
        sys.exit(1)

    # 3. Run screenshot capture
    success, expected_png_count = run_screenshot_capture(env, tmp_path, monitors)
    if not success:
        logger.error("Screenshot capture phase failed.")
        sys.exit(1)

    # 4. Wait for screenshots
    monitor_arg_for_squiggle = None
    if env == "wayland":
        # Wayland is special: it *always* produces one PNG.
        # We need to find it and see if it has a number (e.g., "2.png").
        logger.info("Waiting for Wayland screenshot...")
        png_files = []
        timeout_start = time.time()
        while not png_files and (time.time() - timeout_start < 5):
            png_files = list(tmp_path.glob("*.png"))
            if not png_files:
                time.sleep(0.1)
        
        if not png_files:
            logger.error("Timeout: ycaptool did not produce a screenshot.")
            sys.exit(1)
        
        screenshot_file = png_files[0]
        logger.info("Found screenshot: %s", screenshot_file.name)
        
        # Check if the name is "n.png"
        match = re.search(r"^(\d+)\.png$", screenshot_file.name)
        if match:
            monitor_arg_for_squiggle = int(match.group(1))
    
    else:
        # For all other platforms, wait for all n.png files
        logger.info("Waiting for %d screenshot(s)...", expected_png_count)
        all_found = True
        for i in range(1, expected_png_count + 1):
            if not wait_for_file(tmp_path / f"{i}.png"):
                all_found = False
        
        if not all_found:
            logger.error("Failed to find all required screenshots.")
            sys.exit(1)
        
    logger.info("All screenshots captured!")

    # 5. Launch Squiggle
    output_png = launch_squiggle(tmp_path, monitor_arg_for_squiggle)
    if not output_png:
        logger.error("Squiggle capture phase failed.")
        sys.exit(1)
    
    logger.info("Squiggle capture complete: %s", output_png)

    # 6. Launch Electron
    if not launch_electron(output_png):
        logger.error("Failed to launch Electron.")
        sys.exit(1)

    logger.info("--- Development session launched successfully! ---")


if __name__ == "__main__":
    main()
