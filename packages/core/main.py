#!/usr/bin/env python3

import sys
import subprocess
from pathlib import Path


class App:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.detector_script = self.script_dir / "detector.py"
        self.selector_script = self.script_dir / "selector.py"
        self.wayland_script = self.script_dir / "scripts" / "wayland.py"
        self.x11_script = self.script_dir / "scripts" / "x11.sh"
        self.darwin_script = self.script_dir / "scripts" / "darwin.sh"
        self.win32_script = self.script_dir / "scripts" / "win32.ps1"
        
    def detect_environment(self) -> tuple:
        """Run detector.py and return (environment, monitor_count)"""
        try:
            result = subprocess.run(
                [sys.executable, str(self.detector_script)],
                capture_output=True,
                text=True,
                check=True
            )
            lines = result.stdout.strip().split('\n')
            env = None
            count = 1
            
            for line in lines:
                if line.startswith("environment:"):
                    env = line.split(":", 1)[1].strip()
                elif line.startswith("monitor count:"):
                    count = int(line.split(":", 1)[1].strip())
            
            return env, count
            
        except subprocess.CalledProcessError as e:
            print(f"Detector error: {e}")
            return "unknown", 1
        except Exception as e:
            print(f"Detection failed: {e}")
            return "unknown", 1
    
    def run_selector(self) -> int:
        """Run selector.py and return the selected display number"""
        try:
            result = subprocess.run(
                [sys.executable, str(self.selector_script)],
                capture_output=True,
                text=True,
                check=True
            )
            if result.returncode == 0 and result.stdout.strip():
                return int(result.stdout.strip())
            else:
                print("No display selected or selector was closed")
                sys.exit(1)
        except subprocess.CalledProcessError as e:
            print(f"Selector error: {e}")
            sys.exit(1)
        except ValueError:
            print("Invalid output from selector")
            sys.exit(1)
    
    def run_wayland_capture(self, display_num: int = None):
        """Run wayland.py with optional display number"""
        try:
            cmd = [sys.executable, str(self.wayland_script)]
            if display_num is not None:
                cmd.append(str(display_num))
                
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Wayland capture error: {e}")
            sys.exit(1)
    
    def run_x11_capture(self):
        """Run x11.sh script"""
        try:
            # Make script executable
            self.x11_script.chmod(0o755)
            subprocess.run([str(self.x11_script)], check=True)
        except subprocess.CalledProcessError as e:
            print(f"X11 capture error: {e}")
            sys.exit(1)
    
    def run_darwin_capture(self):
        """Run darwin.sh script"""
        try:
            # Make script executable
            self.darwin_script.chmod(0o755)
            subprocess.run([str(self.darwin_script)], check=True)
        except subprocess.CalledProcessError as e:
            print(f"macOS capture error: {e}")
            sys.exit(1)
    
    def run_win32_capture(self):
        """Run win32.ps1 script"""
        try:
            subprocess.run([
                "powershell", "-ExecutionPolicy", "Bypass", 
                "-File", str(self.win32_script)
            ], check=True)
        except subprocess.CalledProcessError as e:
            print(f"Windows capture error: {e}")
            sys.exit(1)
    
    def launch(self):
        """Main launch sequence based on environment detection"""
        print("SpatialShot: Detecting environment...")
        env, monitor_count = self.detect_environment()
        
        print(f"Environment: {env}, Monitors: {monitor_count}")
        
        if env == "wayland":
            if monitor_count == 1:
                print("SpatialShot: Single screen detected, capturing directly...")
                self.run_wayland_capture()  # No args - wayland.py defaults to display 1
            else:
                print("SpatialShot: Multiple screens detected, launching selector...")
                display_num = self.run_selector()
                print(f"SpatialShot: Capturing display {display_num}...")
                self.run_wayland_capture(display_num)
        elif env == "x11":
            print("SpatialShot: X11 environment detected, capturing all screens...")
            self.run_x11_capture()
        elif env == "darwin":
            print("SpatialShot: macOS environment detected, capturing all screens...")
            self.run_darwin_capture()
        elif env == "win32":
            print("SpatialShot: Windows environment detected, capturing all screens...")
            self.run_win32_capture()
        else:
            print(f"SpatialShot: Environment '{env}' not supported")
            sys.exit(1)
        
        print("SpatialShot: Capture complete!")


if __name__ == "__main__":
    App().launch()
