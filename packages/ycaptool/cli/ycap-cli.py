#!/usr/bin/env python3
"""
ycap-cli.py - Wayland Capture CLI
Captures a specific display using bundled flameshot executable.
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path
from typing import Tuple, Optional

def show_help():
    print("""ycap-cli - Wayland Capture CLI
Usage: ycap-cli [DISPLAY_NUMBER] [OPTIONS]

Arguments:
  DISPLAY_NUMBER    Display number to capture (1-based, default: 1)

Options:
  --help, -h       Show this help message
  --version, -v    Show version information
  --list-displays  List available displays (placeholder)

Examples:
  ycap-cli           # Capture display 1
  ycap-cli 2         # Capture display 2
  ycap-cli --help    # Show help
""")


def show_version():
    print("ycap-cli 1.0.0 - Wayland Capture Tool")
    print("Part of SpatialShot project")

def run_cmd(cmd: list[str], capture: bool = True) -> Tuple[int, str]:
    try:
        res = subprocess.run(cmd, check=False,
                             stdout=subprocess.PIPE if capture else None,
                             stderr=subprocess.STDOUT if capture else None,
                             text=True)
        out = res.stdout.strip() if capture and res.stdout is not None else ""
        return res.returncode, out
    except FileNotFoundError:
        return 127, ""

AUDIO_BACKEND: Optional[str] = None
PREV_MUTE: Optional[str] = None
AUDIO_MUTED_BY_SCRIPT = False

def mute_audio():
    global AUDIO_BACKEND, PREV_MUTE, AUDIO_MUTED_BY_SCRIPT
    if shutil.which("pactl"):
        AUDIO_BACKEND = "pactl"
        rc, out = run_cmd(["pactl", "get-sink-mute", "@DEFAULT_SINK@"])
        PREV_MUTE = out.split()[-1] if out else "unknown"
        if PREV_MUTE != "yes":
            run_cmd(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "1"], capture=False)
            AUDIO_MUTED_BY_SCRIPT = True
        return
    if shutil.which("wpctl"):
        AUDIO_BACKEND = "wpctl"
        rc, out = run_cmd(["wpctl", "get-mute", "@DEFAULT_SINK@"])
        PREV_MUTE = out.strip() if out else "unknown"
        if PREV_MUTE not in ("true", "True"):
            run_cmd(["wpctl", "set-mute", "@DEFAULT_SINK@", "true"], capture=False)
            AUDIO_MUTED_BY_SCRIPT = True
        return
    if shutil.which("amixer"):
        AUDIO_BACKEND = "amixer"
        rc, out = run_cmd(["amixer", "get", "Master"])
        prev = "unknown"
        for token in out.split():
            if token.startswith("[on]") or token.startswith("[off]") or token in ("[on]", "[off]"):
                prev = token.strip("[]")
                break
        PREV_MUTE = prev
        if PREV_MUTE == "on":
            run_cmd(["amixer", "set", "Master", "mute"], capture=False)
            AUDIO_MUTED_BY_SCRIPT = True
        return

def restore_audio():
    global AUDIO_BACKEND, PREV_MUTE, AUDIO_MUTED_BY_SCRIPT
    if not AUDIO_MUTED_BY_SCRIPT:
        return
    try:
        if AUDIO_BACKEND == "pactl":
            if PREV_MUTE != "yes":
                run_cmd(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "0"], capture=False)
        elif AUDIO_BACKEND == "wpctl":
            if PREV_MUTE not in ("true", "True"):
                run_cmd(["wpctl", "set-mute", "@DEFAULT_SINK@", "false"], capture=False)
        elif AUDIO_BACKEND == "amixer":
            if PREV_MUTE == "on":
                run_cmd(["amixer", "set", "Master", "unmute"], capture=False)
    except Exception:
        pass


def get_flameshot_path() -> str:
    """Get the path to bundled flameshot executable"""
    try:
        if getattr(sys, 'frozen', False):
            bundle_dir = Path(sys._MEIPASS)
        else:
            bundle_dir = Path(__file__).parent
        
        bundled_flameshot = bundle_dir / "flameshot"
        
        if bundled_flameshot.exists():
            bundled_flameshot.chmod(0o755)
            return str(bundled_flameshot)
        
        system_flameshot = shutil.which("flameshot")
        if system_flameshot:
            print("Warning: Using system flameshot instead of bundled version", file=sys.stderr)
            return system_flameshot
        
        print(f"Error: No flameshot executable found. Bundled: {bundled_flameshot}", file=sys.stderr)
        sys.exit(1)
        
    except Exception as e:
        print(f"Error locating flameshot: {e}", file=sys.stderr)
        sys.exit(1)


def capture_display(display_num: int) -> Tuple[bool, str]:
    """
    Capture display (1-based). Returns (success, message).
    """
    if display_num <= 0:
        return False, "invalid display number"

    save_path = Path(os.environ.get("SC_SAVE_PATH", Path.home()/".config"/"spatialshot"/"tmp"))
    save_path.mkdir(parents=True, exist_ok=True)
    image_fmt = "png"
    output_file = save_path / f"{display_num}.{image_fmt}"

    flameshot_path = get_flameshot_path()
    flameshot_index = display_num - 1

    try:
        mute_audio()
    except Exception as e:
        print(f"Warning: Could not mute audio: {e}", file=sys.stderr)

    try:
        rc, out = run_cmd([
            flameshot_path, "screen", "-n", str(flameshot_index), 
            "--path", str(output_file)
        ], capture=True)
        
        if rc == 0:
            return True, f"Saved: {output_file}"
        
        error_msg = f"Capture failed for display {display_num} (rc={rc})"
        if out:
            error_msg += f": {out}"
        return False, error_msg
        
    except Exception as e:
        return False, f"Exception during capture: {str(e)}"
    finally:
        try:
            restore_audio()
        except Exception as e:
            print(f"Warning: Could not restore audio: {e}", file=sys.stderr)


def main():

    display_num = 1
    show_help_flag = False
    show_version_flag = False
    
    for arg in sys.argv[1:]:
        if arg in ('--help', '-h'):
            show_help_flag = True
        elif arg in ('--version', '-v'):
            show_version_flag = True
        elif arg == '--list-displays':
            print("Display listing not yet implemented")
            sys.exit(0)
        else:
            try:
                display_num = int(arg)
            except ValueError:
                print(f"Error: Invalid argument '{arg}'", file=sys.stderr)
                print("Use 'ycap-cli --help' for usage information", file=sys.stderr)
                sys.exit(1)
    
    if show_help_flag:
        show_help()
        sys.exit(0)
        
    if show_version_flag:
        show_version()
        sys.exit(0)
    
    if len(sys.argv) == 1:
        print(f"No display specified, defaulting to display {display_num}")
    
    success, message = capture_display(display_num)
    
    if success:
        print(f"Success: {message}")
        sys.exit(0)
    else:
        print(f"Error: {message}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
    