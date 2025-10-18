import subprocess
from typing import Tuple, List
import logging

logger = logging.getLogger("ycaptool.cli.utils")


def run_cmd(cmd: List[str], capture: bool = True) -> Tuple[int, str]:
    try:
        res = subprocess.run(
            cmd,
            check=False,
            stdout=subprocess.PIPE if capture else None,
            stderr=subprocess.STDOUT if capture else None,
            text=True,
        )
        output = res.stdout.strip() if capture and res.stdout is not None else ""
        return res.returncode, output
    except FileNotFoundError:
        logger.error("Command not found: %s", cmd[0] if cmd else "<empty>")
        return 127, ""
