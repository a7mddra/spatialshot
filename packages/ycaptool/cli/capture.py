import os
import sys
import shutil
import logging
from pathlib import Path
from typing import Tuple

from utils import run_cmd
from audio import AudioManager
from notify import NotificationManager

logger = logging.getLogger("ycaptool.cli.capture")


class Capture:
    def __init__(self):
        self.audio_manager = AudioManager()
        self.notify_manager = NotificationManager()

    def get_flameshot_path(self) -> str:
        try:
            if getattr(sys, "frozen", False):
                bundle_dir = Path(sys._MEIPASS)
            else:
                bundle_dir = Path(__file__).parent

            bundled = bundle_dir / "flameshot"
            if bundled.exists():
                try:
                    bundled.chmod(0o755)
                except Exception:
                    pass
                return str(bundled)

            system_path = shutil.which("flameshot")
            if system_path:
                logger.warning("Using system-installed flameshot: %s", system_path)
                return system_path

            logger.error("No flameshot executable found. Expected %s", bundled)
            raise SystemExit(1)
        except Exception as exc:
            logger.error("Error locating flameshot: %s", exc)
            raise SystemExit(1)

    def capture_display(self, display_num: int) -> Tuple[bool, str]:
        if display_num <= 0:
            return False, "invalid display number"

        SC_SAVE_PATH = Path.home() / ".config" / "spatialshot" / "tmp"
        save_path = Path(os.environ.get("SC_SAVE_PATH", SC_SAVE_PATH))
        save_path.mkdir(parents=True, exist_ok=True)
        image_fmt = "png"
        output_file = save_path / f"{display_num}.{image_fmt}"

        flameshot_path = self.get_flameshot_path()
        flameshot_index = display_num - 1

        try:
            self.audio_manager.mute_audio()
            self.notify_manager.enable_dnd()
        except Exception as exc:
            logger.warning("Could not mute audio: %s", exc)

        try:
            rc, out = run_cmd([
                                flameshot_path, "screen", "-n",
                                str(flameshot_index), "--path",
                                str(output_file)
                                ], capture=True)
            if rc == 0:
                return True, f"Saved: {output_file}"
            msg = f"Capture failed for display {display_num} (rc={rc})"
            if out:
                msg += f": {out}"
            return False, msg
        except Exception as exc:
            return False, f"Exception during capture: {exc}"
        finally:
            try:
                self.audio_manager.restore_audio()
                self.notify_manager.restore_dnd()
            except Exception as exc:
                logger.warning("Could not restore audio: %s", exc)
