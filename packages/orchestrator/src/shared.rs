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

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::mpsc::{Receiver, Sender};
use std::thread;
use std::time::Duration;
use anyhow::{Context, Result};

#[derive(Debug)]
pub enum MonitorEvent {
    ScreenshotsReady(Vec<u32>),
    SquiggleFinished(u32),
}

#[derive(Debug)]
pub struct ProjectPaths {
    pub tmp_dir: PathBuf,
    pub squiggle_bin: PathBuf,
    pub ycaptool_bin: PathBuf,
    pub spatialshot_dir: PathBuf,
}

pub fn clear_tmp(tmp_path: &Path) -> Result<()> {
    if tmp_path.exists() {
        fs::remove_dir_all(tmp_path)
            .with_context(|| format!("Failed to remove tmp directory at {:?}", tmp_path))?;
    }
    fs::create_dir_all(tmp_path)
        .with_context(|| format!("Failed to create tmp directory at {:?}", tmp_path))?;
    println!("[INFO] Cleared and recreated tmp directory: {:?}", tmp_path);
    Ok(())
}

pub fn run_command(mut command: Command) -> Result<()> {
    let status = command.status()?;
    if !status.success() {
        anyhow::bail!("Command failed with status: {}", status);
    }
    Ok(())
}

pub fn spawn_command(mut command: Command) -> Result<()> {
    command.stdout(Stdio::null());
    command.stderr(Stdio::null());
    command.spawn()?;
    Ok(())
}

fn find_squiggle_output(tmp_dir: &Path) -> Option<u32> {
    if let Ok(entries) = fs::read_dir(tmp_dir) {
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
                if file_name.starts_with('o') && file_name.ends_with(".png") {
                    if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                        if let Ok(monitor_num) = stem[1..].parse::<u32>() {
                            return Some(monitor_num);
                        }
                    }
                }
            }
        }
    }
    None
}

pub fn monitor_tmp_directory(tx: Sender<MonitorEvent>, paths: ProjectPaths, is_wayland: bool, expected_monitors: u32) {
    println!("[MONITOR] Started on core {:?}", core_affinity::get_core_ids().unwrap()[0]);

    // --- Phase 1: Wait for initial screenshots ---
    loop {
        if let Ok(entries) = fs::read_dir(&paths.tmp_dir) {
            let png_files: Vec<PathBuf> = entries
                .filter_map(Result::ok)
                .map(|e| e.path())
                .filter(|p| p.extension().and_then(|s| s.to_str()) == Some("png") && p.file_stem().unwrap() != "output")
                .collect();

            if is_wayland {
                if !png_files.is_empty() {
                    let file_name = png_files[0].file_stem().unwrap().to_str().unwrap();
                    if let Ok(monitor_num) = file_name.parse::<u32>() {
                        println!("[MONITOR] Wayland capture found for monitor {}", monitor_num);
                        tx.send(MonitorEvent::ScreenshotsReady(vec![monitor_num])).unwrap();
                        break;
                    }
                }
            } else {
                if png_files.len() >= expected_monitors as usize {
                    println!("[MONITOR] All {} screenshots found.", expected_monitors);
                    tx.send(MonitorEvent::ScreenshotsReady(Vec::new())).unwrap();
                    break;
                }
            }
        }
        thread::sleep(Duration::from_millis(100));
    }

    // --- Phase 2: Wait for squiggle's output (o*.png) ---
    loop {
        if let Some(monitor_num) = find_squiggle_output(&paths.tmp_dir) {
            println!("[MONITOR] Squiggle finished. Output found for monitor {}", monitor_num);
            tx.send(MonitorEvent::SquiggleFinished(monitor_num)).unwrap();
            break;
        }
        thread::sleep(Duration::from_millis(100));
    }

    println!("[MONITOR] Finished. Exiting monitor thread.");
}
