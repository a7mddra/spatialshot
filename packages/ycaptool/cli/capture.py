import os
import sys
import shutil
from pathlib import Path
from typing import Tuple

from utils import run_cmd
from audio import AudioManager

class Capture:
    def __init__(self):
        self.audio_manager = AudioManager()

    def get_flameshot_path(self) -> str:
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

    def capture_display(self, display_num: int) -> Tuple[bool, str]:
        """
        Capture display (1-based). Returns (success, message).
        """
        if display_num <= 0:
            return False, "invalid display number"

        save_path = Path(os.environ.get("SC_SAVE_PATH", Path.home()/".config"/"spatialshot"/"tmp"))
        save_path.mkdir(parents=True, exist_ok=True)
        image_fmt = "png"
        output_file = save_path / f"{display_num}.{image_fmt}"

        flameshot_path = self.get_flameshot_path()
        flameshot_index = display_num - 1

        try:
            self.audio_manager.mute_audio()
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
                self.audio_manager.restore_audio()
            except Exception as e:
                print(f"Warning: Could not restore audio: {e}", file=sys.stderr)
