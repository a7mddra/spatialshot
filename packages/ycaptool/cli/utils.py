import subprocess
from typing import Tuple

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
