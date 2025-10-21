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

import sys
from typing import List


class ArgsParser:
    def __init__(self, argv: List[str]):
        self.argv = argv
        self.display_num = 1
        self.show_help = False
        self.show_version = False
        self.list_displays = False
        self.error = False
        self.error_message = ""

        self._parse()

    def _parse(self):
        for arg in self.argv[1:]:
            if arg in ("--help", "-h"):
                self.show_help = True
            elif arg in ("--version", "-v"):
                self.show_version = True
            elif arg == "--list-displays":
                self.list_displays = True
            else:
                try:
                    self.display_num = int(arg)
                except ValueError:
                    self.error = True
                    self.error_message = f"Invalid argument: {arg}"
                    return
