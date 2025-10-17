import sys

class ArgsParser:
    def __init__(self, argv):
        self.argv = argv
        self.display_num = 1
        self.show_help = False
        self.show_version = False
        self.list_displays = False
        self.error = None
        self.error_message = ""

        self._parse()

    def _parse(self):
        for arg in self.argv[1:]:
            if arg in ('--help', '-h'):
                self.show_help = True
            elif arg in ('--version', '-v'):
                self.show_version = True
            elif arg == '--list-displays':
                self.list_displays = True
            else:
                try:
                    self.display_num = int(arg)
                except ValueError:
                    self.error = True
                    self.error_message = f"Error: Invalid argument '{arg}'"
                    return
