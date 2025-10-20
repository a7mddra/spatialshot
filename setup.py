#!/usr/bin/env python3
"""
Build orchestrator (replaces your original first script).

Features and style:
- Formal logging and clear docstrings.
- Streaming of subprocess stdout/stderr line-by-line to terminal and logger.
- Single-line spinner retained while output streams (spinner reprints after each streamed line).
- Data classes for target configuration.
- Explicit and informative error handling via BuildError.
"""

from __future__ import annotations

import argparse
import logging
import queue
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Sequence

# --- Path setup ---
SCRIPT_PATH = Path(__file__).resolve()
PRJKT_ROOT = SCRIPT_PATH.parent
PKGS_PATH = PRJKT_ROOT / "packages"

# --- Logging setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    stream=sys.stdout,
)
_LOG_ROOT = "spatialshot.build"


class BuildError(RuntimeError):
    """Raised when a build step fails."""


@dataclass
class BuildTarget:
    """Configuration for a single build target."""
    name: str
    path: Path
    platform: str = "any"
    build_script: Optional[str] = None
    commands: List[Sequence[str]] = field(default_factory=list)


# --- Build targets ---
BUILD_TARGETS: Dict[str, BuildTarget] = {
    "ycaptool": BuildTarget(
        name="ycaptool",
        path=PKGS_PATH / "ycaptool",
        build_script="build.sh",
        platform="linux",
    ),
    "squiggle": BuildTarget(
        name="squiggle",
        path=PKGS_PATH / "squiggle" / "Qt-Dynamic",
        build_script="build.sh",
        platform="linux",
    ),
    "spatialshot": BuildTarget(
        name="spatialshot",
        path=PKGS_PATH / "spatialshot",
        commands=[
            ["npm", "install"],
            ["npm", "run", "build"],
        ],
        platform="any",
    ),
}

_SPINNER_CHARS = "/-\\|"
_SPINNER_INTERVAL = 0.12
_HIDE_CURSOR = "\033[?25l"
_SHOW_CURSOR = "\033[?25h"
_RESET_LINE = "\r"
_CLEAR_LINE = "\033[K"


def get_logger(name: str):
    """Return a module-specific logger."""
    return logging.getLogger(f"{_LOG_ROOT}.{name}")


def _enqueue_stream(stream, q: "queue.Queue[tuple[str,str]]", tag: str):
    """
    Read lines from stream and place them into the queue.
    Each queue item is a tuple: (tag, line).
    tag is "STDOUT" or "STDERR".
    """
    try:
        for raw_line in iter(stream.readline, ""):
            if raw_line == "":
                break
            line = raw_line.rstrip("\n")
            q.put((tag, line))
    finally:
        stream.close()


def run_command_streaming(
    command: Sequence[str],
    cwd: Path,
    logger: logging.Logger,
    spinner_text: str = "",
    env: Optional[dict] = None,
) -> None:
    """
    Run a command while streaming stdout/stderr to both the terminal and the logger.
    A single-line spinner is maintained on the terminal while output lines appear above it.

    Raises:
        BuildError: on failure or if command cannot be executed.
    """
    cmd_str = " ".join(command)
    logger.info(f"▶ Executing: `{cmd_str}`")

    try:
        proc = subprocess.Popen(
            list(command),
            cwd=str(cwd),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True,
        )
    except FileNotFoundError:
        logger.error(f"Command not found: {command[0]}")
        raise BuildError(f"Command not found: {command[0]}")
    except Exception as exc:
        logger.error(f"Failed to start command `{cmd_str}`: {exc}")
        raise BuildError(f"Failed to start command `{cmd_str}`: {exc}")

    q: "queue.Queue[tuple[str,str]]" = queue.Queue()
    threads: List[threading.Thread] = []
    if proc.stdout:
        t_out = threading.Thread(target=_enqueue_stream, args=(proc.stdout, q, "STDOUT"), daemon=True)
        threads.append(t_out)
        t_out.start()
    if proc.stderr:
        t_err = threading.Thread(target=_enqueue_stream, args=(proc.stderr, q, "STDERR"), daemon=True)
        threads.append(t_err)
        t_err.start()

    spinner_idx = 0
    try:
        sys.stdout.write(_HIDE_CURSOR)
        sys.stdout.flush()

        spinner_char = _SPINNER_CHARS[spinner_idx % len(_SPINNER_CHARS)]
        spinner_idx += 1
        sys.stdout.write(f"{_RESET_LINE}[{spinner_char}] {spinner_text}... ")
        sys.stdout.flush()

        while True:
            try:
                tag, line = q.get(timeout=_SPINNER_INTERVAL)
            except queue.Empty:
                if proc.poll() is not None and q.empty():
                    break
                
                spinner_char = _SPINNER_CHARS[spinner_idx % len(_SPINNER_CHARS)]
                spinner_idx += 1
                sys.stdout.write(f"{_RESET_LINE}[{spinner_char}] {spinner_text}... ")
                sys.stdout.flush()
                continue

            sys.stdout.write(_RESET_LINE + _CLEAR_LINE)
            
            if tag == "STDOUT":
                sys.stdout.write(f"  {line}\n")
            else:
                sys.stdout.write(f"\033[2;31m  {line}\033[0m\n")
            
            spinner_char = _SPINNER_CHARS[spinner_idx % len(_SPINNER_CHARS)]
            spinner_idx += 1
            sys.stdout.write(f"[{spinner_char}] {spinner_text}... ")
            sys.stdout.flush()

        returncode = proc.wait()
        
        while not q.empty():
            tag, line = q.get_nowait()
            sys.stdout.write(_RESET_LINE + _CLEAR_LINE)
            if tag == "STDOUT":
                sys.stdout.write(f"  {line}\n")
            else:
                sys.stdout.write(f"\033[2;31m  {line}\033[0m\n")

        sys.stdout.write(_RESET_LINE + _CLEAR_LINE)
        sys.stdout.flush()

        if returncode != 0:
            logger.error(f"Command `{cmd_str}` failed (exit code {returncode})")
            raise BuildError(f"Command `{cmd_str}` failed (exit code {returncode})")
        
        logger.info(f"✔ Command completed: `{cmd_str}`")

    finally:
        for t in threads:
            if t.is_alive():
                try: t.join(timeout=0.1)
                except Exception: pass
        sys.stdout.write(_SHOW_CURSOR)
        sys.stdout.flush()


def build_target(target_name: str) -> None:
    """Build a single target by name."""
    logger = get_logger(target_name)
    logger.info(f"--- Building Target: {target_name} ---")

    target = BUILD_TARGETS.get(target_name)
    if target is None:
        raise BuildError(f"Unknown build target: {target_name}")

    if not target.path.exists():
        raise BuildError(f"Target path does not exist: {target.path}")

    if target.platform != "any" and target.platform not in sys.platform:
        raise NotImplementedError(
            f"Build for '{target_name}' not supported on platform '{sys.platform}'"
        )

    if target.build_script:
        script_path = target.path / target.build_script
        if not script_path.is_file():
            raise BuildError(f"Build script not found: {script_path}")
        
        try:
            script_path.chmod(0o755)
        except Exception as e:
            logger.warning(f"Could not chmod +x {script_path}: {e}")
            
        run_command_streaming(
            ["/bin/bash", str(script_path)],
            cwd=target.path,
            logger=logger,
            spinner_text=f"Running {target.build_script}",
        )

    for cmd in target.commands:
        run_command_streaming(
            list(cmd),
            cwd=target.path,
            logger=logger,
            spinner_text=f"Running {' '.join(cmd)}",
        )

    logger.info(f"--- Finished Target: {target_name} ---")


def list_targets() -> None:
    """Print the available build targets."""
    print("Available build targets:")
    for name, target in BUILD_TARGETS.items():
        print(f"  - {name:<12} (platform: {target.platform})")


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(description="Build script for the Spatialshot project.")
    parser.add_argument(
        "-t", "--target",
        choices=list(BUILD_TARGETS.keys()),
        help="Build a specific target. If omitted, all targets are built."
    )
    parser.add_argument(
        "--list-targets",
        action="store_true",
        help="List available build targets and exit."
    )
    return parser.parse_args()


def main() -> None:
    """Entry point for the build orchestrator."""
    args = parse_args()
    main_logger = get_logger("main")
    main_logger.info("Build orchestrator started.")

    if args.list_targets:
        list_targets()
        return

    targets = [args.target] if args.target else list(BUILD_TARGETS.keys())

    try:
        for t in targets:
            build_target(t)
        main_logger.info("All requested build targets completed successfully.")
    except NotImplementedError as ni:
        main_logger.error(f"Platform unsupported: {ni}")
        sys.exit(1)
    except BuildError as be:
        main_logger.error(f"Build failed: {be}")
        sys.exit(1)
    except Exception as exc:
        main_logger.critical(f"An unexpected error occurred: {exc}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
