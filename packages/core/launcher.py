#!/usr/bin/env python3

import sys
import subprocess
from pathlib import Path


class ElectronLauncher:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.electron_app_dir = self.script_dir / ".." / ".." / "packages" / "capture"
    
    def launch_dev(self):
        """Launch Electron app in development mode (npm start)"""
        try:
            if self.electron_app_dir.exists():
                print("Starting Electron app in development mode...")
                subprocess.run(["npm", "start"], cwd=str(self.electron_app_dir), check=True)
            else:
                print(f"Electron app not found at: {self.electron_app_dir}")
                sys.exit(1)
        except subprocess.CalledProcessError as e:
            print(f"Electron development error: {e}")
            sys.exit(1)
    
    def launch_prod(self):
        """Launch Electron app in production mode"""
        system = platform.system().lower()
        
        if system == "windows":
            exe_candidates = [
                self.script_dir / "spatialshot.exe",
                self.script_dir / "dist" / "spatialshot.exe",
            ]
        elif system == "darwin":
            app_candidates = [
                self.script_dir / "spatialshot.app",
                self.script_dir / "dist" / "spatialshot.app",
            ]
        else:  # linux
            appimage_candidates = [
                self.script_dir / "spatialshot.AppImage",
                self.script_dir / "dist" / "spatialshot.AppImage",
            ]
        
        print("Production Electron launch - looking for packaged app...")
        
        print("Production app not found, falling back to development mode...")
        self.launch_dev()
    
    def launch(self, production=False):
        """Main launch sequence"""
        if production:
            self.launch_prod()
        else:
            self.launch_dev()


if __name__ == "__main__":
    import platform
    
    production = "--production" in sys.argv
    
    launcher = ElectronLauncher()
    launcher.launch(production=production)
