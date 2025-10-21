'''
    Copyright (C) 2025  a7mddra-spatialshot
  
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
  
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
  
    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
'''

import shutil
import logging
from typing import Optional

from utils import run_cmd

logger = logging.getLogger("ycaptool.cli.notify")


class NotificationManager:
    """
    Manages the 'Do Not Disturb' (DND) state for various
    Linux desktop environments to suppress notifications.
    """

    def __init__(self):
        self.backend: Optional[str] = None
        self.prev_state: Optional[bool] = None
        self.dnd_enabled_by_script = False

    def _check_gsettings(self) -> bool:
        """Check for Gnome/gsettings DND state."""
        _, out = run_cmd(["gsettings", "get", "org.gnome.desktop.notifications", "show-banners"], capture=True)
        return out.strip().lower() == "true" # "true" means banners are ON (DND is OFF)

    def _check_dunstctl(self) -> bool:
        """Check for dunst DND state."""
        _, out = run_cmd(["dunstctl", "is-paused"], capture=True)
        return out.strip().lower() == "false" # "false" means not paused (DND is OFF)

    def _check_qdbus(self) -> bool:
        """Check for KDE Plasma DND state."""
        _, out = run_cmd([
            "qdbus", "org.kde.plasmashell",
            "/org/kde/NotificationManager",
            "org.kde.NotificationManager.notificationsEnabled"
        ], capture=True)
        return out.strip().lower() == "true" # "true" means notifications are ON (DND is OFF)

    def enable_dnd(self):
        """
        Enables 'Do Not Disturb' by disabling notifications.
        Saves the previous state to be restored later.
        """
        try:
            if shutil.which("gsettings"):
                self.backend = "gsettings"
                self.prev_state = self._check_gsettings() # true = banners on
                if self.prev_state:
                    run_cmd(["gsettings", "set", "org.gnome.desktop.notifications", "show-banners", "false"])
                    self.dnd_enabled_by_script = True
                return

            if shutil.which("dunstctl"):
                self.backend = "dunstctl"
                self.prev_state = self._check_dunstctl() # false = not paused
                if self.prev_state:
                    run_cmd(["dunstctl", "set-paused", "true"])
                    self.dnd_enabled_by_script = True
                return

            if shutil.which("qdbus"):
                self.backend = "qdbus"
                self.prev_state = self._check_qdbus() # true = notifications on
                if self.prev_state:
                    run_cmd([
                        "qdbus", "org.kde.plasmashell",
                        "/org/kde/NotificationManager",
                        "org.kde.NotificationManager.setNotificationsEnabled", "false"
                    ])
                    self.dnd_enabled_by_script = True
                return

            logger.warning("No DND backend (gsettings, dunstctl, qdbus) found. Notifications may appear.")

        except Exception as exc:
            logger.error("Failed to enable DND using backend '%s': %s", self.backend, exc)

    def restore_dnd(self):
        """
Any
        Restores the notification state to what it was before
        enable_dnd() was called.
        """
        if not self.dnd_enabled_by_script or self.prev_state is None:
            return

        try:
            if self.backend == "gsettings" and self.prev_state:
                run_cmd(["gsettings", "set", "org.gnome.desktop.notifications", "show-banners", "true"])
            
            elif self.backend == "dunstctl" and self.prev_state:
                run_cmd(["dunstctl", "set-paused", "false"])
            
            elif self.backend == "qdbus" and self.prev_state:
                run_cmd([
                    "qdbus", "org.kde.plasmashell",
                    "/org/kde/NotificationManager",
                    "org.kde.NotificationManager.setNotificationsEnabled", "true"
                ])
                
        except Exception as exc:
            logger.warning("Failed to restore DND state: %s", exc)
