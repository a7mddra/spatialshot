import sys
from args import ArgsParser
from capture import Capture

class YCapApp:
    def __init__(self, argv):
        self.argv = argv
        self.args = ArgsParser(argv)
        self.capture = Capture()

    def run(self):
        if self.args.error:
            print(self.args.error_message, file=sys.stderr)
            print("Use 'ycap-cli --help' for usage information", file=sys.stderr)
            sys.exit(1)

        if self.args.show_help:
            self.show_help()
            sys.exit(0)
            
        if self.args.show_version:
            self.show_version()
            sys.exit(0)

        if self.args.list_displays:
            print("Display listing not yet implemented")
            sys.exit(0)
        
        if len(self.argv) == 1:
            print(f"No display specified, defaulting to display {self.args.display_num}")
        
        success, message = self.capture.capture_display(self.args.display_num)
        
        if success:
            print(f"Success: {message}")
            sys.exit(0)
        else:
            print(f"Error: {message}", file=sys.stderr)
            sys.exit(1)

    @staticmethod
    def show_help():
        print("""ycap-cli - Wayland Capture CLI
Usage: ycap-cli [DISPLAY_NUMBER] [OPTIONS]

Arguments:
  DISPLAY_NUMBER    Display number to capture (1-based, default: 1)

Options:
  --help, -h       Show this help message
  --version, -v    Show version information
  --list-displays  List available displays (placeholder)

Examples:
  ycap-cli           # Capture display 1
  ycap-cli 2         # Capture display 2
  ycap-cli --help    # Show help
""")

    @staticmethod
    def show_version():
        print("ycap-cli 1.0.0 - Wayland Capture Tool")
        print("Part of SpatialShot project")

def main():
    app = YCapApp(sys.argv)
    app.run()
