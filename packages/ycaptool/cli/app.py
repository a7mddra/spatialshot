import sys
import logging
from args import ArgsParser
from capture import Capture

logger = logging.getLogger("ycaptool.cli.app")


class YCapApp:
    def __init__(self, argv):
        self.argv = argv
        self.args = ArgsParser(argv)
        self.capture = Capture()

    def run(self):
        if self.args.error:
            logger.error(self.args.error_message)
            logger.error("Use 'ycap-cli --help' for usage information")
            sys.exit(1)

        if self.args.show_help:
            self.show_help()
            sys.exit(0)

        if self.args.show_version:
            self.show_version()
            sys.exit(0)

        if self.args.list_displays:
            logger.info("Display listing not implemented")
            sys.exit(0)

        if len(self.argv) == 1:
            logger.info("No display specified; defaulting to %d", self.args.display_num)

        success, message = self.capture.capture_display(self.args.display_num)

        if success:
            logger.info("Success: %s", message)
            sys.exit(0)
        else:
            logger.error("Error: %s", message)
            sys.exit(1)

    @staticmethod
    def show_help():
        print(
            "ycap-cli - Wayland Capture CLI\n"
            "Usage: ycap-cli [DISPLAY_NUMBER] [OPTIONS]\n\n"
            "Arguments:\n"
            "  DISPLAY_NUMBER    Display number to capture (1-based, default: 1)\n\n"
            "Options:\n"
            "  --help, -h       Show this help message\n"
            "  --version, -v    Show version information\n"
            "  --list-displays  List available displays (placeholder)\n\n"
            "Examples:\n"
            "  ycap-cli\n"
            "  ycap-cli 2\n"
            "  ycap-cli --help\n"
        )

    @staticmethod
    def show_version():
        print("ycap-cli 1.0.0 - Wayland Capture Tool")
        print("Part of SpatialShot project")


def main():
    app = YCapApp(sys.argv)
    app.run()
