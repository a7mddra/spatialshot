#!/usr/bin/env python3
from pathlib import Path
import sys
import time
import shutil
import subprocess
import logging
import re

from detector import identify_display_environment, probe_monitor_count

HOME = Path.home()
SCRIPT_PATH = Path(__file__).resolve()
DEV_ROOT = SCRIPT_PATH.parent
CORE_ROOT = DEV_ROOT.parent
PACKAGES_ROOT = CORE_ROOT.parent
REPO_ROOT = PACKAGES_ROOT.parent

TMP_PATH_UNIX = HOME / ".config" / "spatialshot" / "tmp"
TMP_PATH_WIN = HOME / "AppData" / "Roaming" / "spatialshot" / "tmp"
YCAP_BINARY = PACKAGES_ROOT / "ycaptool" / "bin" / "ycaptool"
ELECTRON_PROJECT = PACKAGES_ROOT / "squiggle"
SCRIPT_WIN = CORE_ROOT / "windows" / "win32.ps1"
SCRIPT_MAC = CORE_ROOT / "macos" / "darwin.sh"
SCRIPT_X11 = CORE_ROOT / "linux" / "x11.sh"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("spatialshot.dev.launcher")

def clear_tmp() -> Path:
    tmp = TMP_PATH_WIN if sys.platform == "win32" else TMP_PATH_UNIX
    if tmp.exists():
        try:
            shutil.rmtree(tmp)
            logger.info("Removed existing temporary directory: %s", tmp)
        except Exception as exc:
            logger.error("Failed to remove temporary directory %s: %s", tmp, exc)
    try:
        tmp.mkdir(parents=True, exist_ok=True)
        logger.info("Created temporary directory: %s", tmp)
    except Exception as exc:
        logger.error("Failed to create temporary directory %s: %s", tmp, exc)
        raise
    return tmp

def monitor_tmp(target: Path, expected_count: int, timeout: int = 10) -> tuple[bool, int | None]:
    logger.info("Monitoring %s for %d image(s)", target, expected_count)
    deadline = time.time() + float(timeout)
    monitor_number = None
    while time.time() < deadline:
        try:
            pngs = list(target.glob("*.png"))
            if pngs:
                # Look for n.png (e.g., 1.png, 2.png)
                for png in pngs:
                    match = re.match(r"(\d+)\.png", png.name)
                    if match:
                        monitor_number = int(match.group(1))
                        logger.info("Detected monitor %d from %s", monitor_number, png)
                        return True, monitor_number
            time.sleep(0.1)
        except Exception as exc:
            logger.error("Failed to scan target directory %s: %s", target, exc)
            time.sleep(0.1)
    logger.error("Timeout waiting for images in %s: expected %d", target, expected_count)
    return False, None

def _run_process(command: list, cwd: Path | None = None) -> bool:
    try:
        subprocess.run(command, cwd=str(cwd) if cwd is not None else None, check=True)
        logger.info("Command succeeded: %s", " ".join(map(str, command)))
        return True
    except subprocess.CalledProcessError as exc:
        logger.error("Command failed (%s): %s", " ".join(map(str, command)), exc)
        return False
    except FileNotFoundError as exc:
        logger.error("Command not found: %s", command[0])
        return False

def run_windows_capture() -> tuple[bool, int | None]:
    logger.info("Initiating capture: Windows")
    tmp = clear_tmp()
    script = SCRIPT_WIN
    if not script.exists():
        logger.error("Windows capture script missing: %s", script)
        return False, None
    success = _run_process(["powershell", "-ExecutionPolicy", "Bypass", "-File", str(script)])
    if not success:
        return False, None
    return monitor_tmp(tmp, probe_monitor_count())

def run_macos_capture() -> tuple[bool, int | None]:
    logger.info("Initiating capture: macOS")
    tmp = clear_tmp()
    script = SCRIPT_MAC
    if not script.exists():
        logger.error("macOS capture script missing: %s", script)
        return False, None
    if not _run_process(["bash", str(script)]):
        return False, None
    return monitor_tmp(tmp, probe_monitor_count())

def run_linux_capture(environment: str) -> tuple[bool, int | None]:
    logger.info("Initiating capture: Linux (%s)", environment)
    tmp = clear_tmp()
    if environment == "x11":
        script = SCRIPT_X11
        if not script.exists():
            logger.error("X11 capture script missing: %s", script)
            return False, None
        if not _run_process(["bash", str(script)]):
            return False, None
        return monitor_tmp(tmp, probe_monitor_count())
    if environment == "wayland":
        ycap = YCAP_BINARY
        if not ycap.exists():
            logger.error("ycaptool binary not found: %s", ycap)
            logger.info("Build ycaptool: cd packages/ycaptool && ./build.sh")
            return False, None
        monitors = probe_monitor_count()
        if monitors > 1:
            logger.info("Multiple monitors detected (%d). Launching selector.", monitors)
            if not _run_process([str(ycap), "--multi"]):
                return False, None
            # Assume ycaptool --multi outputs n.png for selected monitor
            return monitor_tmp(tmp, 1)
        else:
            logger.info("Single monitor detected. Launching direct capture.")
            if not _run_process([str(ycap)]):
                return False, None
            return monitor_tmp(tmp, 1)
    logger.error("Unsupported Linux environment: %s", environment)
    return False, None

def launch_electron(monitor: int | None) -> bool:
    project = ELECTRON_PROJECT
    if not project.exists():
        logger.error("Electron project not found: %s", project)
        return False
    logger.info("Starting Electron (development mode) for monitor %s", monitor if monitor else "all")
    command = ["npm", "start"]
    if monitor is not None:
        command.extend(["--", str(monitor)])
    return _run_process(command, cwd=project)

def main() -> None:
    logger.info("SpatialShot Development Launcher started")
    env = identify_display_environment()
    monitors = probe_monitor_count()
    logger.info("Environment: %s", env)
    logger.info("Monitors detected: %d", monitors)
    success, monitor = False, None
    if env == "win32":
        success, monitor = run_windows_capture()
    elif env == "darwin":
        success, monitor = run_macos_capture()
    elif env in ("x11", "wayland"):
        success, monitor = run_linux_capture(env)
    else:
        logger.error("Unsupported environment: %s", env)
        sys.exit(1)
    if not success:
        logger.error("Capture phase failed")
        sys.exit(1)
    if not launch_electron(monitor):
        logger.error("Failed to start Electron")
        sys.exit(1)
    logger.info("Development session complete")

if __name__ == "__main__":
    main()
