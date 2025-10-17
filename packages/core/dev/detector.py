#!/usr/bin/env python3
"""Environment and display enumeration utilities for SpatialShot."""

from __future__ import annotations

import os
import platform
import subprocess
import glob
import ctypes
import logging
from ctypes import byref, c_uint32
from typing import Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("spatialshot.detector")


def identify_display_environment() -> str:
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
        return "unknown"
    return "unknown"


def _probe_gdk() -> Optional[int]:
    try:
        import gi  # type: ignore
        try:
            gi.require_version("Gtk", "3.0")
            gi.require_version("Gdk", "3.0")
        except Exception:
            pass
        from gi.repository import Gdk, Gtk  # type: ignore

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


def _probe_xrandr() -> Optional[int]:
    try:
        out = subprocess.check_output(["xrandr", "--listmonitors"], stderr=subprocess.DEVNULL, text=True)
        first = out.splitlines()[0].strip()
        if first.lower().startswith("monitors:"):
            parts = first.split()
            if len(parts) >= 2 and parts[1].isdigit():
                return int(parts[1])
    except Exception:
        pass
    return None


def _probe_drm_sysfs() -> Optional[int]:
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
    try:
        user32 = ctypes.windll.user32
        n = user32.GetSystemMetrics(80)
        if n >= 1:
            return int(n)
    except Exception:
        pass
    return None


def _probe_macos() -> Optional[int]:
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
    system_name = platform.system().lower()

    if system_name == "windows":
        n = _probe_windows()
        return n if n is not None and n >= 1 else 1

    if system_name == "darwin":
        n = _probe_macos()
        return n if n is not None and n >= 1 else 1

    n = _probe_gdk()
    if n and n >= 1:
        return n

    n = _probe_xrandr()
    if n and n >= 1:
        return n

    n = _probe_drm_sysfs()
    if n and n >= 1:
        return n

    return 1


if __name__ == "__main__":
    env = identify_display_environment()
    count = probe_monitor_count()
    logger.info("environment: %s", env)
    logger.info("monitor count: %d", count)
    logger.info("multi-monitor: %s", "yes" if count > 1 else "no")
