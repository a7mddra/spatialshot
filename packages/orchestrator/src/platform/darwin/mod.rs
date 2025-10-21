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
use std::sync::mpsc::Receiver;
use anyhow::{Context, Result};
use crate::shared::{run_command, spawn_command, MonitorEvent, ProjectPaths};

const GRABBER_SCRIPT: &str = include_str!("sc-grapper.sh");
const MONITOR_SCRIPT: &str = include_str!("hm-monitors.sh");

/// The main sequence for macOS.
pub fn run(rx: Receiver<MonitorEvent>, paths: &ProjectPaths) -> Result<()> {
    // Step 1: Run Screen Grabber
    println!("[SEQ] Running sc-grapper.sh...");
    run_command(Command::new("/bin/bash").arg("-c").arg(GRABBER_SCRIPT))
        .context("Failed to execute sc-grapper.sh.")?;

    // Step 2: Wait for screenshots
    println!("[SEQ] Waiting for screenshots...");
    match rx.recv()? {
        MonitorEvent::ScreenshotsReady(_) => {
            println!("[SEQ] Screenshots ready. Proceeding to launch squiggle.");
        },
        _ => anyhow::bail!("Received unexpected event while waiting for screenshots."),
    }

    // Step 3: Launch Squiggle
    println!("[SEQ] Launching squiggle...");
    run_command(Command::new(&paths.squiggle_bin))
        .context("Failed to execute squiggle.")?;

    // Step 4: Wait for squiggle finish
    println!("[SEQ] Waiting for squiggle to finish...");
    let ui_monitor;
    match rx.recv()? {
        MonitorEvent::SquiggleFinished(monitor_num) => {
            ui_monitor = monitor_num;
            println!("[SEQ] Squiggle finished. Launching UI on monitor {}.", ui_monitor);
        },
        _ => anyhow::bail!("Received unexpected event while waiting for squiggle output."),
    }

    // Step 5: Launch SpatialShot UI
    println!("[SEQ] Launching spatialshot UI...");
    let mut ui_cmd = Command::new("npm");
    ui_cmd.current_dir(&paths.spatialshot_dir)
          .arg("start")
          .arg("--")
          .arg(paths.tmp_dir.join("output.png"))
          .arg(format!("--monitor={}", ui_monitor));
    
    spawn_command(ui_cmd).context("Failed to spawn spatialshot UI.")?;

    Ok(())
}

pub fn get_monitor_count() -> Result<u32> {
    let output = Command::new("/bin/bash").arg("-c").arg(MONITOR_SCRIPT).output()?;
    let count_str = String::from_utf8(output.stdout)?.trim().to_string();
    let count = count_str.parse::<u32>()?;
    Ok(count)
}
