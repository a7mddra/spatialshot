#!/usr/bin/env python3
"""
wayland.py
Captures a specific display using bundled flameshot executable.
If no arguments provided, defaults to display 1 (primary).
"""
import os
import sys
import shutil
import subprocess
from pathlib import Path
from typing import Tuple, Optional


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


# ---------------- audio mute/restore ----------------
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
    """Get the path to bundled flameshot executable using relative path"""
    script_dir = Path(__file__).parent
    bundled_flameshot = script_dir / ".." / ".." / ".." / "third-party" / "flameshot" / "bin" / "flameshot"
    bundled_flameshot = bundled_flameshot.resolve()
    
    if bundled_flameshot.exists():
        return str(bundled_flameshot)
    
    print(f"Error: Bundled flameshot not found at {bundled_flameshot}", file=sys.stderr)
    sys.exit(1)


def capture_display(display_num: int, save_path: Optional[Path] = None) -> Tuple[bool, str]:
    """
    Capture display (1-based). Returns (success, message).
    """
    if display_num <= 0:
        return False, "invalid display number"

    save_path = Path(save_path) if save_path else Path(os.environ.get("SC_SAVE_PATH", Path.home() / "Desktop"))
    save_path.mkdir(parents=True, exist_ok=True)
    image_fmt = "png"
    output_file = save_path / f"{display_num}.{image_fmt}"

    flameshot_path = get_flameshot_path()
    flameshot_index = display_num - 1

    # Mute audio to skip shutter sound
    try:
        mute_audio()
    except Exception as e:
        print(f"Warning: Could not mute audio: {e}", file=sys.stderr)

    try:
        # Try per-display capture
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
        # Restore audio
        try:
            restore_audio()
        except Exception as e:
            print(f"Warning: Could not restore audio: {e}", file=sys.stderr)


def main():
    # Default to display 1
    if len(sys.argv) > 1:
        try:
            display_num = int(sys.argv[1])
        except ValueError:
            print(f"Error: Invalid display number '{sys.argv[1]}'. Must be an integer.", file=sys.stderr)
            sys.exit(1)
    else:
        display_num = 1
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
