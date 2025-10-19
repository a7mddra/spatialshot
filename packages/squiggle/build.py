#!/usr/bin/env python3
"""
build.py — Statically build SpatialShot Squiggle for the host OS.

This script builds a single, standalone binary for the platform it's running on.
It's designed to be run locally for development and on CI runners (Windows,
macOS, Linux) to produce release packages.

CRITICAL:
You must set the CMAKE_PREFIX_PATH environment variable to point to your
*native* static Qt 6 installation (e.g., /opt/qt6-static)

Usage:
  python3 build.py              # Build for host OS, output to ./dist
  python3 build.py --install    # Build AND install for host OS (dev mode)
"""

from __future__ import annotations
import argparse
import logging
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List, Optional

# --- Project Setup ---
PROJECT_ROOT = Path(__file__).resolve().parent
BUILD_DIR = PROJECT_ROOT / "build"
DIST_DIR = PROJECT_ROOT / "dist"
APPLICATION_NAME = "spatialshot-squiggle"

logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
)
logger = logging.getLogger("build")

# --- Helper Functions ---
def find_executable(name: str) -> Optional[str]:
    """Finds an executable in the system's PATH."""
    path = shutil.which(name)
    if not path:
        logger.error("Failed to find required executable: %s", name)
        logger.error("Please install it and ensure it's in your PATH.")
    return path

def run(command: Iterable[str], cwd: Optional[Path] = None, env: Optional[dict] = None) -> None:
    """Runs a command and raises an exception on failure."""
    cmd_str = " ".join(map(str, command))
    logger.info("Running: %s", cmd_str)
    try:
        subprocess.run(command, check=True, cwd=cwd, env=env)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        logger.error("Command failed: %s", cmd_str)
        raise e

def configure_and_build(build_path: Path, cmake_extra: Optional[List[str]] = None, config: str = "Release") -> Path:
    """Configures a CMake project and builds it."""
    build_path.mkdir(parents=True, exist_ok=True)
    
    cmake_path = find_executable("cmake")
    if not cmake_path:
        raise FileNotFoundError("cmake not found")

    cmake_cmd = [
        cmake_path,
        str(PROJECT_ROOT),
        "-B", str(build_path),
        f"-DCMAKE_BUILD_TYPE={config}",
        "-DBUILD_STATIC=ON",
    ]
    if cmake_extra:
        cmake_cmd.extend(cmake_extra)

    run(cmake_cmd)
    
    cpu_count = str(os.cpu_count() or 4)
    logger.info("Building with %s parallel jobs", cpu_count)
    run([cmake_path, "--build", str(build_path), "--config", config, "--", "-j", cpu_count])
    
    host_platform = get_host_platform()
    if host_platform == "windows":
        binary_path = DIST_DIR / f"{APPLICATION_NAME}.exe"
    else:
        binary_path = DIST_DIR / APPLICATION_NAME
        
    if not binary_path.exists():
        logger.warning("Binary not found in dist/, searching build dir...")
        search_paths = [
            build_path / config / f"{APPLICATION_NAME}.exe",
            build_path / f"{APPLICATION_NAME}.exe",
            build_path / APPLICATION_NAME,
        ]
        for path in search_paths:
            if path.exists():
                logger.info("Found binary at fallback path: %s", path)
                shutil.copy2(path, binary_path)
                return binary_path
        raise FileNotFoundError(f"Build succeeded but output binary not found.")
    
    return binary_path

def get_host_platform() -> str:
    """Determines the current operating system."""
    if sys.platform.startswith("linux"):
        return "linux"
    if sys.platform == "darwin":
        return "darwin"
    if sys.platform.startswith("win"):
        return "windows"
    raise SystemExit(f"Unsupported platform: {sys.platform}")

# --- Target Build Function ---
def build_for_host() -> Path:
    """Builds the binary for the current host OS."""
    host = get_host_platform()
    logger.info("--- Building for Host OS: %s ---", host.upper())
    
    if not os.environ.get("CMAKE_PREFIX_PATH"):
        logger.error("ERROR: CMAKE_PREFIX_PATH environment variable is not set.")
        logger.error("Please set it to the root of your *native* static Qt 6 installation.")
        sys.exit(1)
    
    logger.info("Using Qt static build from: %s", os.environ["CMAKE_PREFIX_PATH"])

    cmake_args = []
    
    if host == "linux":
        target_dir = BUILD_DIR / "linux-static"
    elif host == "darwin":
        target_dir = BUILD_DIR / "mac-static"
        # Forcing x86_64 for broader compatibility, can be changed.
        # Or remove to build for native arch (e.g., arm64 on M1)
        cmake_args = ["-DCMAKE_OSX_ARCHITECTURES=x86_64"]
    elif host == "windows":
        target_dir = BUILD_DIR / "windows-static"
        # Assuming MinGW Makefiles on Windows. 
        # CI runners might need "Visual Studio 17 2022" etc.
        # This part might need tweaking based on the CI env.
        if find_executable("mingw32-make"):
             cmake_args = ["-G", "MinGW Makefiles"]
        else:
            logger.info("MinGW not found, using default CMake generator (e.g., Visual Studio)")

    binary_path = configure_and_build(target_dir, cmake_extra=cmake_args)
    
    logger.info("Successfully created standalone binary: %s", binary_path)
    return binary_path

# --- Installation ---
def install_for_host(binary_path: Path) -> None:
    """Installs the built artifact for the current host OS (dev mode)."""
    host = get_host_platform()
    logger.info("--- Installing artifact for host: %s ---", host)

    if host in ("linux", "darwin"):
        install_path = Path("/usr/local/bin")
        dest = install_path / binary_path.name
        logger.info("Installing '%s' to '%s' (may require sudo)", binary_path.name, dest)
        try:
            run(["sudo", "cp", str(binary_path), str(dest)])
            run(["sudo", "chmod", "+x", str(dest)])
            logger.info("Installation complete. '%s' is now in your PATH.", dest.name)
        except Exception as e:
            logger.error("Failed to install. Do you have sudo permissions?")
            logger.error("Run manually: sudo cp %s %s", binary_path, dest)
            raise e

    elif host == "windows":
        # Install to a user-specific bin directory
        install_path = Path.home() / "spatialshot" / "bin"
        install_path.mkdir(parents=True, exist_ok=True)
        dest = install_path / binary_path.name
        logger.info("Installing '%s' to '%s'", binary_path.name, dest)
        shutil.copy2(binary_path, dest)
        
        logger.info("Attempting to add '%s' to user PATH.", install_path)
        try:
            cmd = f'$oldPath = [Environment]::GetEnvironmentVariable("Path", "User"); if($oldPath -notlike "*{install_path}*") {{ $newPath = "{install_path};" + $oldPath; [Environment]::SetEnvironmentVariable("Path", $newPath, "User"); Write-Host "PATH updated. Please restart your terminal." }} else {{ Write-Host "Path already contains directory." }}'
            subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-Command", cmd], check=True, capture_output=True)
        except Exception:
            logger.warning("Could not automatically update PATH. Please add '%s' manually.", install_path)
        
        logger.info("Installation complete. '%s' is at %s", dest.name, dest)
        logger.warning("Please restart your terminal/shell for PATH changes to take effect.")

# --- Main Execution ---
def main() -> None:
    parser = argparse.ArgumentParser(description="Static build script for spatialshot-squiggle.")
    parser.add_argument(
        "--install",
        action="store_true",
        help="Build AND install the binary to the system PATH (dev mode)."
    )
    args = parser.parse_args()

    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    try:
        binary_path = build_for_host()
        
        if args.install:
            install_for_host(binary_path)
            
        logger.info("--- Build process finished ---")
        logger.info("Final binary location: %s", binary_path)

    except (subprocess.CalledProcessError, FileNotFoundError, SystemExit) as e:
        logger.error("--- Build FAILED ---")
        if not isinstance(e, SystemExit):
            logger.error(e)
        sys.exit(1)

if __name__ == "__main__":
    main()
