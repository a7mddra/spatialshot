import pytest
from launcher import identify_display_environment, probe_monitor_count
from unittest.mock import MagicMock, patch

class TestDetector:
    def test_identify_display_environment_windows(self, mock_platform, mock_os_environ):
        mock_platform.return_value = "Windows"
        assert identify_display_environment() == "win32"

    def test_identify_display_environment_macos(self, mock_platform, mock_os_environ):
        mock_platform.return_value = "Darwin"
        assert identify_display_environment() == "darwin"

    def test_identify_display_environment_linux_x11(self, mock_platform, mock_os_environ):
        mock_platform.return_value = "Linux"
        mock_os_environ["DISPLAY"] = ":0"
        assert identify_display_environment() == "x11"

    def test_identify_display_environment_linux_wayland(self, mock_platform, mock_os_environ):
        mock_platform.return_value = "Linux"
        mock_os_environ["WAYLAND_DISPLAY"] = "wayland-0"
        assert identify_display_environment() == "wayland"

    def test_identify_display_environment_unknown(self, mock_platform, mock_os_environ):
        mock_platform.return_value = "UnknownOS"
        assert identify_display_environment() == "unknown"

    @patch("launcher._probe_windows")
    def test_probe_monitor_count_windows(self, mock_probe_windows, mock_platform):
        mock_platform.return_value = "Windows"
        mock_probe_windows.return_value = 2
        assert probe_monitor_count() == 2

    @patch("launcher._probe_macos")
    def test_probe_monitor_count_macos(self, mock_probe_macos, mock_platform):
        mock_platform.return_value = "Darwin"
        mock_probe_macos.return_value = 3
        assert probe_monitor_count() == 3

    @patch("launcher._probe_gdk")
    @patch("launcher._probe_xrandr")
    @patch("launcher._probe_drm_sysfs")
    def test_probe_monitor_count_linux_gdk(self, mock_drm, mock_xrandr, mock_gdk, mock_platform):
        mock_platform.return_value = "Linux"
        mock_gdk.return_value = 2
        mock_xrandr.return_value = None
        mock_drm.return_value = None
        assert probe_monitor_count() == 2

    @patch("launcher._probe_gdk")
    @patch("launcher._probe_xrandr")
    @patch("launcher._probe_drm_sysfs")
    def test_probe_monitor_count_linux_xrandr(self, mock_drm, mock_xrandr, mock_gdk, mock_platform):
        mock_platform.return_value = "Linux"
        mock_gdk.return_value = None
        mock_xrandr.return_value = 3
        mock_drm.return_value = None
        assert probe_monitor_count() == 3

    @patch("launcher._probe_gdk")
    @patch("launcher._probe_xrandr")
    @patch("launcher._probe_drm_sysfs")
    def test_probe_monitor_count_linux_drm(self, mock_drm, mock_xrandr, mock_gdk, mock_platform):
        mock_platform.return_value = "Linux"
        mock_gdk.return_value = None
        mock_xrandr.return_value = None
        mock_drm.return_value = 4
        assert probe_monitor_count() == 4

    @patch("launcher._probe_gdk")
    @patch("launcher._probe_xrandr")
    @patch("launcher._probe_drm_sysfs")
    def test_probe_monitor_count_linux_fallback(self, mock_drm, mock_xrandr, mock_gdk, mock_platform):
        mock_platform.return_value = "Linux"
        mock_gdk.return_value = None
        mock_xrandr.return_value = None
        mock_drm.return_value = None
        assert probe_monitor_count() == 1
