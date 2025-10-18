#!/usr/bin/env python3
"""
build.py — Statically build and package SpatialShot Squiggle.

Produces single-file, standalone, terminal-launchable executables for selected
targets by statically linking the Qt framework.

CRITICAL: This script requires a static build of Qt 6. You must set the
CMAKE_PREFIX_PATH environment variable to point to your static Qt installation.
See README.md for details.

Outputs under ./dist:
  - Linux:   A single, standalone ELF executable
  - macOS:   A single, standalone Mach-O executable
  - Windows: A single, standalone .exe executable

Usage:
  # Ensure CMAKE_PREFIX_PATH is set first!
  python3 build.py                 # Build for all targets and install for host OS.
  python3 build.py --no-install    # Build but do not install.
  python3 build.py --targets linux # Build for a specific target.
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
    format="%(asctime)s %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("build")


# --- Helper Functions ---
def find_executable(name: str) -> Optional[str]:
    """Finds an executable in the system's PATH."""
    return shutil.which(name)

def run(command: Iterable[str], cwd: Optional[Path] = None, env: Optional[dict] = None) -> None:
    """Runs a command and raises an exception on failure."""
    cmd_str = " ".join(map(str, command))
    logger.info("Running: %s", cmd_str)
    subprocess.run(command, check=True, cwd=cwd, env=env)

def configure_and_build(build_path: Path, cmake_extra: Optional[List[str]] = None, config: str = "Release") -> None:
    """Configures a CMake project and builds it."""
    build_path.mkdir(parents=True, exist_ok=True)
    
    cmake_cmd = [
        "cmake",
        str(PROJECT_ROOT),
        "-B", str(build_path),
        f"-DCMAKE_BUILD_TYPE={config}",
        "-DBUILD_STATIC=ON",  # Enforce static build
    ]
    if cmake_extra:
        cmake_cmd.extend(cmake_extra)

    run(cmake_cmd)
    run(["cmake", "--build", str(build_path), "--config", config, "--", "-j", str(os.cpu_count() or 4)])


# --- Target Build Functions ---
def build_linux() -> None:
    logger.info("--- Building for Linux (Static ELF) ---")
    if not sys.platform.startswith("linux"):
        logger.warning("Skipping native Linux build on non-Linux host.")
        return
        
    target_dir = BUILD_DIR / "linux-static"
    configure_and_build(target_dir)

    binary = DIST_DIR / APPLICATION_NAME
    if binary.exists():
        logger.info("Successfully created standalone Linux binary: %s", binary)
    else:
        raise FileNotFoundError(f"Build succeeded but output binary not found at {binary}")

def build_windows() -> None:
    logger.info("--- Building for Windows (Static EXE) ---")
    if not sys.platform.startswith("win"):
        logger.warning("Skipping native Windows build on non-Windows host.")
        return

    target_dir = BUILD_DIR / "windows-static"
    configure_and_build(target_dir, cmake_extra=["-G", "MinGW Makefiles"])
    
    exe = DIST_DIR / f"{APPLICATION_NAME}.exe"
    if exe.exists():
        logger.info("Successfully created standalone Windows binary: %s", exe)
    else:
        raise FileNotFoundError(f"Build succeeded but output binary not found at {exe}")

def build_macos() -> None:
    logger.info("--- Building for macOS (Static Mach-O) ---")
    if not sys.platform == "darwin":
        logger.warning("Skipping native macOS build on non-macOS host.")
        return
        
    target_dir = BUILD_DIR / "mac-static"
    # Forcing x86_64 for broader compatibility, can be changed to arm64
    configure_and_build(target_dir, cmake_extra=["-DCMAKE_OSX_ARCHITECTURES=x86_64"])
    
    binary = DIST_DIR / APPLICATION_NAME
    if binary.exists():
        logger.info("Successfully created standalone macOS binary: %s", binary)
    else:
        raise FileNotFoundError(f"Build succeeded but output binary not found at {binary}")


# --- Installation ---
def install_for_host() -> None:
    """Installs the built artifact for the current host OS."""
    host = sys.platform
    logger.info("--- Installing artifact for host: %s ---", host)
    install_path = Path("/usr/local/bin") # Default for Linux/macOS

    if host.startswith("linux"):
        src = DIST_DIR / APPLICATION_NAME
        if not src.exists():
            logger.error("Linux binary not found in dist/. Cannot install.")
            return
        dest = install_path / APPLICATION_NAME
        logger.info("Installing '%s' to '%s' (requires sudo)", src.name, dest)
        run(["sudo", "cp", str(src), str(dest)])
        run(["sudo", "chmod", "+x", str(dest)])

    elif host == "darwin":
        src = DIST_DIR / APPLICATION_NAME
        if not src.exists():
            logger.error("macOS binary not found in dist/. Cannot install.")
            return
        dest = install_path / APPLICATION_NAME
        logger.info("Installing '%s' to '%s' (requires sudo)", src.name, dest)
        run(["sudo", "cp", str(src), str(dest)])
        run(["sudo", "chmod", "+x", str(dest)])
        
    elif host.startswith("win"):
        src = DIST_DIR / f"{APPLICATION_NAME}.exe"
        if not src.exists():
            logger.error("Windows binary not found in dist/. Cannot install.")
            return
        # Install to a user-specific bin directory and add to PATH
        install_path = Path.home() / "bin"
        install_path.mkdir(exist_ok=True)
        dest = install_path / src.name
        logger.info("Installing '%s' to '%s'", src.name, dest)
        shutil.copy2(src, dest)
        
        # Add to user PATH if not already present (Windows only)
        logger.info("Adding '%s' to user PATH if not already present.", install_path)
        try:
            # Use PowerShell for a more reliable PATH update
            cmd = f'$oldPath = [Environment]::GetEnvironmentVariable("Path", "User"); if($oldPath -notlike "*{install_path}*") {{ $newPath = $oldPath + ";{install_path}"; [Environment]::SetEnvironmentVariable("Path", $newPath, "User"); Write-Host "PATH updated. Please restart your terminal." }} else {{ Write-Host "Path already contains directory." }}'
            subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-Command", cmd], check=True, capture_output=True)
        except Exception as e:
            logger.error("Could not automatically update PATH. Please add '%s' manually.", install_path)
            logger.error(e)
            
    else:
        logger.warning("Host platform '%s' unsupported for installation.", host)
        return
        
    logger.info("Installation complete.")


# --- Main Execution ---
def main() -> None:
    parser = argparse.ArgumentParser(description="Static build script for spatialshot-squiggle.")
    parser.add_argument("--no-install", action="store_true", help="Do not install the host artifact after build")
    parser.add_argument("--targets", nargs="*", choices=["linux", "darwin", "windows"], default=["linux", "darwin", "windows"], help="Targets to build")
    args = parser.parse_args()

    if not os.environ.get("CMAKE_PREFIX_PATH"):
        logger.error("ERROR: CMAKE_PREFIX_PATH environment variable is not set.")
        logger.error("Please set it to the root of your static Qt 6 installation directory.")
        sys.exit(1)

    # Clean and prepare directories
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    build_functions = {
        "linux": build_linux,
        "windows": build_windows,
        "darwin": build_macos,
    }

    for target in args.targets:
        try:
            build_functions[target]()
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.error("--- %s build FAILED: %s ---", target.upper(), e)
        except Exception as e:
            logger.error("--- An unexpected error occurred during the %s build: %s ---", target.upper(), e)


    if not args.no_install:
        try:
            install_for_host()
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logger.error("--- Installation FAILED: %s ---", e)
    else:
        logger.info("Skipping installation as requested.")

    logger.info("--- Build process finished ---")
    logger.info("Distribution summary in %s:", DIST_DIR)
    for p in sorted(DIST_DIR.glob("**/*")):
        logger.info("  - %s", p.relative_to(DIST_DIR))

if __name__ == "__main__":
    main()
