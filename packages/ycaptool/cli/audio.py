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

logger = logging.getLogger("ycaptool.cli.audio")


class AudioManager:
    def __init__(self):
        self.audio_backend: Optional[str] = None
        self.prev_mute: Optional[str] = None
        self.audio_muted_by_script = False

    def mute_audio(self):
        if shutil.which("pactl"):
            self.audio_backend = "pactl"
            _, out = run_cmd(["pactl", "get-sink-mute", "@DEFAULT_SINK@"], capture=True)
            self.prev_mute = out.split()[-1] if out else "unknown"
            if self.prev_mute != "yes":
                run_cmd(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "1"], capture=False)
                self.audio_muted_by_script = True
            return

        if shutil.which("wpctl"):
            self.audio_backend = "wpctl"
            _, out = run_cmd(["wpctl", "get-mute", "@DEFAULT_SINK@"], capture=True)
            self.prev_mute = out.strip() if out else "unknown"
            if self.prev_mute not in ("true", "True"):
                run_cmd(["wpctl", "set-mute", "@DEFAULT_SINK@", "true"], capture=False)
                self.audio_muted_by_script = True
            return

        if shutil.which("amixer"):
            self.audio_backend = "amixer"
            _, out = run_cmd(["amixer", "get", "Master"], capture=True)
            prev = "unknown"
            for token in (out or "").split():
                if token.startswith("[on]") or token.startswith("[off]") or token in ("[on]", "[off]"):
                    prev = token.strip("[]")
                    break
            self.prev_mute = prev
            if self.prev_mute == "on":
                run_cmd(["amixer", "set", "Master", "mute"], capture=False)
                self.audio_muted_by_script = True
            return

    def restore_audio(self):
        if not self.audio_muted_by_script:
            return
        try:
            if self.audio_backend == "pactl":
                if self.prev_mute != "yes":
                    run_cmd(["pactl", "set-sink-mute", "@DEFAULT_SINK@", "0"], capture=False)
            elif self.audio_backend == "wpctl":
                if self.prev_mute not in ("true", "True"):
                    run_cmd(["wpctl", "set-mute", "@DEFAULT_SINK@", "false"], capture=False)
            elif self.audio_backend == "amixer":
                if self.prev_mute == "on":
                    run_cmd(["amixer", "set", "Master", "unmute"], capture=False)
        except Exception as exc:
            logger.warning("Failed to restore audio: %s", exc)
