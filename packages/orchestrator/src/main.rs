/**
 *  Copyright (C) 2025  a7mddra-spatialshot
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
**/

use std::process::Command;

fn main() {
    println!("Running script to mute system sound...");
    run_script();

    println!("Launching Google Chrome...");
    launch_chrome();
}

#[cfg(target_os = "windows")]
fn run_script() {
    let status = Command::new("powershell")
        .args(&["-File", "mute.ps1"])
        .status()
        .expect("Failed to execute PowerShell script.");

    if status.success() {
        println!("Script executed successfully.");
    } else {
        println!("Script execution failed.");
    }
}

#[cfg(not(target_os = "windows"))]
fn run_script() {
    let status = Command::new("sh")
        .arg("mute.sh")
        .status()
        .expect("Failed to execute shell script.");

    if status.success() {
        println!("Script executed successfully.");
    } else {
        println!("Script execution failed.");
    }
}

#[cfg(target_os = "windows")]
fn launch_chrome() {
    Command::new("cmd")
        .args(&["/C", "start chrome"])
        .spawn()
        .expect("Failed to launch Google Chrome.");
}

#[cfg(target_os = "linux")]
fn launch_chrome() {
    Command::new("google-chrome")
        .spawn()
        .expect("Failed to launch Google Chrome. Make sure it's installed and in your PATH.");
}

#[cfg(target_os = "macos")]
fn launch_chrome() {
    Command::new("open")
        .args(&["-a", "Google Chrome"])
        .spawn()
        .expect("Failed to launch Google Chrome.");
}
