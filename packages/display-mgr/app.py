#!/usr/bin/env python3
"""
wayland_flameshot_selector.py
Creates one small selector window centered on each monitor. Clicking "Cap here"
captures that monitor (using flameshot) and reports the result.

Usage:
    ./wayland_flameshot_selector.py
"""
from __future__ import annotations
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path
from typing import Optional, Tuple

# Try to import GTK (PyGObject)
try:
    import gi
    gi.require_version("Gtk", "3.0")
    from gi.repository import Gtk, Gdk, GLib
except Exception as e:
    print("This script requires PyGObject (GTK3). Install python3-gi and gir1.2-gtk-3.0.", file=sys.stderr)
    print("Error:", e, file=sys.stderr)
    sys.exit(1)


# ---------------- generic helpers ----------------
def has(cmd: str) -> bool:
    return shutil.which(cmd) is not None

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

# ---------------- audio mute/restore (same logic) ----------------
AUDIO_BACKEND: Optional[str] = None
PREV_MUTE: Optional[str] = None
AUDIO_MUTED_BY_SCRIPT = False

def mute_audio():
    global AUDIO_BACKEND, PREV_MUTE, AUDIO_MUTED_BY_SCRIPT
    if has("pactl"):
        AUDIO_BACKEND = "pactl"
        rc, out = run_cmd(["pactl", "get-sink-mute", "@DEFAULT_SINK@"])
        PREV_MUTE = out.split()[-1] if out else "unknown"
        if PREV_MUTE != "yes":
            run_cmd(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "1"], capture=False)
            AUDIO_MUTED_BY_SCRIPT = True
        return
    if has("wpctl"):
        AUDIO_BACKEND = "wpctl"
        rc, out = run_cmd(["wpctl", "get-mute", "@DEFAULT_SINK@"])
        PREV_MUTE = out.strip() if out else "unknown"
        if PREV_MUTE not in ("true", "True"):
            run_cmd(["wpctl", "set-mute", "@DEFAULT_SINK@", "true"], capture=False)
            AUDIO_MUTED_BY_SCRIPT = True
        return
    if has("amixer"):
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

# ---------------- wayland check ----------------
def is_wayland() -> bool:
    if os.environ.get("XDG_SESSION_TYPE", "").lower() == "wayland":
        return True
    if os.environ.get("WAYLAND_DISPLAY"):
        return True
    return False

# ---------------- capture logic (same as before) ----------------
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

    if not is_wayland():
        return False, "Not running under Wayland"

    if not has("flameshot"):
        return False, "flameshot not installed"

    flameshot_index = display_num - 1

    # Mute audio (best-effort)
    try:
        mute_audio()
    except Exception:
        pass

    try:
        rc, _ = run_cmd(["flameshot", "screen", "-n", str(flameshot_index), "--path", str(output_file)], capture=False)
        if rc == 0:
            return True, f"Saved: {output_file}"
        # fallback
        temp_file = Path(f"/tmp/screenshot_fallback.{image_fmt}")
        rc_full, _ = run_cmd(["flameshot", "full", "--path", str(temp_file)], capture=False)
        if rc_full == 0:
            return False, f"Per-display capture failed; fallback saved: {temp_file}"
        return False, "Both per-display and full capture failed"
    finally:
        try:
            restore_audio()
        except Exception:
            pass

# ---------------- GTK UI ----------------
class MonitorWindow:
    def __init__(self, monitor_index: int, geometry: Gdk.Rectangle, save_path: Path):
        self.monitor_index = monitor_index
        self.geometry = geometry
        self.save_path = save_path

        self.window = Gtk.Window(title=f"Cap: Display {monitor_index + 1}")
        self.window.set_default_size(220, 110)
        self.window.set_decorated(False)  # small borderless feel
        self.window.set_resizable(False)
        self.window.set_keep_above(True)

        v = Gtk.VBox(spacing=6)
        v.set_border_width(8)

        label = Gtk.Label()
        label.set_markup(f"<b>Display {monitor_index + 1}</b>")
        label.set_justify(Gtk.Justification.CENTER)
        v.pack_start(label, False, False, 0)

        self.status = Gtk.Label(label="Ready")
        v.pack_end(self.status, False, False, 0)

        btn = Gtk.Button(label="Cap here")
        btn.connect("clicked", self.on_click)
        v.pack_start(btn, True, True, 0)

        # Quit button
        quit_btn = Gtk.Button(label="Quit")
        quit_btn.connect("clicked", lambda w: Gtk.main_quit())
        v.pack_end(quit_btn, False, False, 0)

        self.window.add(v)
        self.window.show_all()

        # center on monitor
        self.center_on_monitor()

    def center_on_monitor(self):
        # monitor geometry has x,y,width,height
        g = self.geometry
        # get window size request (after show_all)
        win_w, win_h = self.window.get_size()
        pos_x = g.x + max(0, (g.width - win_w) // 2)
        pos_y = g.y + max(0, (g.height - win_h) // 2)
        self.window.move(pos_x, pos_y)

    def set_status(self, text: str):
        # must be called in GTK main thread
        self.status.set_text(text)

    def on_click(self, _btn):
        # run capture in a background thread
        self.set_status("Capturing...")
        threading.Thread(target=self._capture_thread, daemon=True).start()

    def _capture_thread(self):
        succ, message = capture_display(self.monitor_index + 1, self.save_path)
        # update UI in main thread
        GLib.idle_add(self.set_status, message)

def build_selector():
    if not is_wayland():
        print("Wayland-only. Exiting.", file=sys.stderr)
        sys.exit(1)

    if not has("flameshot"):
        print("Error: flameshot not installed.", file=sys.stderr)
        sys.exit(1)

    save_path = Path(os.environ.get("SC_SAVE_PATH", Path.home() / "Desktop"))
    save_path.mkdir(parents=True, exist_ok=True)

    display = Gdk.Display.get_default()
    n_mon = display.get_n_monitors()
    windows = []
    for i in range(n_mon):
        monitor = display.get_monitor(i)
        geom = monitor.get_geometry()
        mw = MonitorWindow(i, geom, save_path)
        windows.append(mw)

    # when all windows are closed or Quit clicked, Gtk.main will stop
    Gtk.main()

if __name__ == "__main__":
    try:
        build_selector()
    except KeyboardInterrupt:
        restore_audio()
        sys.exit(0)
