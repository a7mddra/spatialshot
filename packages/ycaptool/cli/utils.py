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
