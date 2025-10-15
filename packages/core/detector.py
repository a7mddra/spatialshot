#!/usr/bin/env python3
import os
import platform
import subprocess
import glob
import ctypes
from ctypes import byref, c_uint32

def detect_environment() -> str:
    """Return one of: 'wayland', 'x11', 'win32', 'darwin', 'unknown'."""
    system = platform.system().lower()
    if system == "windows":
        return "win32"
    if system == "darwin":
        return "darwin"
    if system == "linux":
        xdg = os.environ.get("XDG_SESSION_TYPE", "").lower()
        wayland_env = bool(os.environ.get("WAYLAND_DISPLAY"))
        display_env = bool(os.environ.get("DISPLAY"))
        if wayland_env or xdg == "wayland":
            return "wayland"
        if display_env or xdg == "x11":
            return "x11"
        return "unknown"
    return "unknown"

# ----------------- Linux helpers -----------------
def _try_gdk_count():
    try:
        import gi
        try:
            gi.require_version("Gtk", "3.0")
        except Exception:
            pass
        from gi.repository import Gdk, Gtk

        try:
            if hasattr(Gtk, "init_check"):
                Gtk.init_check()
        except Exception:
            pass

        try:
            disp = Gdk.Display.get_default()
            if disp:
                try:
                    n = disp.get_n_monitors()
                    if isinstance(n, int) and n > 0:
                        return int(n)
                except Exception:
                    pass
        except Exception:
            pass

        try:
            screen = Gdk.Screen.get_default()
            if screen:
                n = screen.get_n_monitors()
                if isinstance(n, int) and n > 0:
                    return int(n)
        except Exception:
            pass

    except Exception:
        return None
    return None


def _try_xrandr_count():
    try:
        out = subprocess.check_output(
            ["xrandr", "--listmonitors"], stderr=subprocess.DEVNULL, text=True)
        first = out.splitlines()[0].strip()
        if first.lower().startswith("monitors:"):
            parts = first.split()
            if len(parts) >= 2 and parts[1].isdigit():
                return int(parts[1])
    except Exception:
        pass
    return None


def _try_drm_sysfs_count():
    try:
        paths = glob.glob("/sys/class/drm/*/status")
        count = 0
        for p in paths:
            try:
                with open(p, "r") as f:
                    status = f.read().strip()
                if status == "connected":
                    count += 1
            except Exception:
                continue
        if count > 0:
            return count
    except Exception:
        pass
    return None


# ----------------- Windows helper -----------------
def _try_windows_count():
    try:
        user32 = ctypes.windll.user32
        n = user32.GetSystemMetrics(80)
        if n >= 1:
            return int(n)
    except Exception:
        pass
    return None


# ----------------- macOS helper -----------------
def _try_macos_count():
    try:
        from AppKit import NSScreen # type: ignore  # noqa
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


# ----------------- Public API -----------------
def get_monitor_count() -> int:
    """
    Best-effort monitor count across platforms.
    Always returns an integer >= 1.
    """
    system = platform.system().lower()

    # Windows
    if system == "windows":
        n = _try_windows_count()
        return n if n is not None and n >= 1 else 1

    # macOS
    if system == "darwin":
        n = _try_macos_count()
        return n if n is not None and n >= 1 else 1

    # Linux / other Unix
    n = _try_gdk_count()
    if n and n >= 1:
        return n

    # Try xrandr (X11)
    n = _try_xrandr_count()
    if n and n >= 1:
        return n

    # Try kernel DRM sysfs
    n = _try_drm_sysfs_count()
    if n and n >= 1:
        return n

    return 1


def is_multi_monitor() -> bool:
    return get_monitor_count() > 1


# ----------------- CLI usage -----------------
if __name__ == "__main__":
    env = detect_environment()
    count = get_monitor_count()
    print(f"environment: {env}")
    print(f"monitor count: {count}")
    print(f"is multi-monitor: {is_multi_monitor()}")
