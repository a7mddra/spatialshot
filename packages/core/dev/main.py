#!/usr/bin/env python3

import sys
import subprocess
import shutil
import platform
import os
from pathlib import Path


class Core:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.detector_script = self.script_dir / "detector.py"
        self.selector_executable = self.script_dir / "bin" / "selector"
        self.wayland_script = self.script_dir / "scripts" / "wayland.py"
        self.x11_script = self.script_dir / "scripts" / "x11.sh"
        self.darwin_script = self.script_dir / "scripts" / "darwin.sh"
        self.win32_script = self.script_dir / "scripts" / "win32.ps1"
        self.electron_launcher = self.script_dir / "launcher.py"
        
    def get_temp_dir(self) -> Path:
        """Get cross-platform temp directory for screenshots"""
        system = platform.system().lower()
        if system == "windows":
            base_dir = Path(os.environ.get('APPDATA', Path.home()))
            temp_dir = base_dir / "spatialshot" / "tmp"
        else:
            # Linux, macOS, etc.
            base_dir = Path.home() / ".config"
            temp_dir = base_dir / "spatialshot" / "tmp"
        
        return temp_dir
    
    def clear_temp_dir(self):
        """Clear temporary screenshot directory"""
        temp_dir = self.get_temp_dir()
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        temp_dir.mkdir(parents=True, exist_ok=True)
        print(f"Cleared temp directory: {temp_dir}")
    
    def set_save_path_env(self):
        """Set SC_SAVE_PATH environment variable for child processes"""
        temp_dir = self.get_temp_dir()
        os.environ["SC_SAVE_PATH"] = str(temp_dir)
        print(f"Set SC_SAVE_PATH to: {temp_dir}")
    
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
        """Run the compiled selector binary and return the selected display number."""
        try:
            result = subprocess.run(
                [str(self.selector_executable)],
                capture_output=True,
                text=True,
                check=True
            )
            if result.returncode == 0 and result.stdout.strip():
                return int(result.stdout.strip())
            else:
                print("No display selected or selector was closed.")
                sys.exit(1)
                
        except FileNotFoundError:
            print(f"Error: Selector executable not found at '{self.selector_executable}'.")
            print("Please make sure the C++ code is compiled and the path is correct.")
            sys.exit(1)
        except subprocess.CalledProcessError as e:
            print(f"Selector exited with an error: {e.stderr}")
            sys.exit(1)
        except ValueError:
            print(f"Invalid output from selector. Expected an integer, but got: '{result.stdout.strip()}'")
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
            self.x11_script.chmod(0o755)
            subprocess.run([str(self.x11_script)], check=True)
        except subprocess.CalledProcessError as e:
            print(f"X11 capture error: {e}")
            sys.exit(1)
    
    def run_darwin_capture(self):
        """Run darwin.sh script"""
        try:
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
    
    def launch_electron(self, mode: str = "dev"):
        """Launch Electron app via launcher.py"""
        try:
            cmd = [sys.executable, str(self.electron_launcher)]
            if mode == "prod":
                cmd.append("--production")
            
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Electron launch error: {e}")
            sys.exit(1)
    
    def run_capture_flow(self):
        """Run the capture flow based on detected environment"""
        print("SpatialShot: Detecting environment...")
        env, monitor_count = self.detect_environment()
        
        print(f"Environment: {env}, Monitors: {monitor_count}")
        
        if env == "wayland":
            if monitor_count == 1:
                print("Single screen detected, capturing directly...")
                self.run_wayland_capture()
            else:
                print("Multiple screens detected, launching selector...")
                display_num = self.run_selector()
                print(f"Capturing display {display_num}...")
                self.run_wayland_capture(display_num)
        elif env == "x11":
            print("X11 environment detected, capturing all screens...")
            self.run_x11_capture()
        elif env == "darwin":
            print("macOS environment detected, capturing all screens...")
            self.run_darwin_capture()
        elif env == "win32":
            print("Windows environment detected, capturing all screens...")
            self.run_win32_capture()
        else:
            print(f"Environment '{env}' not supported")
            sys.exit(1)
        
        print("Capture complete!")
    
    def launch(self, production=False):
        """Main launch sequence"""
        print("SpatialShot Core: Starting...")
        
        self.clear_temp_dir()
        self.set_save_path_env()
        self.run_capture_flow()
        
        # print("Launching Electron app...")
        # mode = "prod" if production else "dev"
        # self.launch_electron(mode)
        
        # print("SpatialShot Core: Complete!")


if __name__ == "__main__":
    prod = "--production" in sys.argv
    
    core = Core()
    core.launch(prod)
