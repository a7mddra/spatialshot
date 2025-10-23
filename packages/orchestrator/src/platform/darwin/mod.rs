/**
 * Copyright (C) 2025  a7mddra-spatialshot
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
**/

use crate::shared::{run_command, spawn_command, AppPaths, MonitorEvent};
use anyhow::{Context, Result};
use log::error;
use std::{path::PathBuf, process::Command, sync::mpsc::Receiver, time::Duration};

const SC_GRABBER_SCRIPT: &str = include_str!("sc-grabber.sh");
const HM_MONITORS_SCRIPT: &str = include_str!("hm-monitors.sh");

pub fn get_monitor_count() -> Result<u32> {
    let output = Command::new("/bin/bash")
        .arg("-c")
        .arg(HM_MONITORS_SCRIPT)
        .stdin(std::process::Stdio::null())
        .output()
        .context("Failed to execute hm-monitors.sh script")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!(
            "hm-monitors.sh failed with status {:?}: {}",
            output.status.code(),
            stderr
        );
        anyhow::bail!("hm-monitors.sh script failed.");
    }

    let count_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let count = count_str
        .parse::<u32>()
        .with_context(|| format!("Failed to parse monitor count output: '{}'", count_str))?;

    Ok(count.max(1))
}

pub fn run(rx: Receiver<MonitorEvent>, paths: &AppPaths) -> Result<()> {
    run_command(
        &PathBuf::from("/bin/bash"),
        &["-c", SC_GRABBER_SCRIPT],
        None,
        None,
    )
    .context("Failed to run sc-grabber.sh")?;



    if !paths.squiggle_bin.exists() {
        error!(
            "Squiggle binary not found at {}",
            paths.squiggle_bin.display()
        );
        anyhow::bail!("Squiggle binary not found.");
    }

    run_command(
        &paths.squiggle_bin,
        &[],
        None,
        None,
    )
    .context("Failed to run squiggle")?;

    let final_output_path: PathBuf;
    match rx
        .recv_timeout(Duration::from_secs(60 * 5))
        .context("Timeout or error waiting for squiggle output from monitor thread")?
    {
        MonitorEvent::SquiggleFinished { output_path } => {
            final_output_path = output_path;
        }
        MonitorEvent::Error(e) => {
            error!("Monitor thread reported error during squiggle wait: {}", e);
            anyhow::bail!("Monitor thread error: {}", e);
        }
        ev => anyhow::bail!(
            "Received unexpected event while waiting for squiggle output: {:?}",
            ev
        ),
    }

    if !paths.electron_exe.exists() {
        error!(
            "SpatialShot UI executable not found at {}",
            paths.electron_exe.display()
        );
        anyhow::bail!("SpatialShot UI executable not found.");
    }

    let output_path_str = final_output_path
        .to_str()
        .context("Squiggle output path is not valid UTF-8")?;

    spawn_command(&paths.electron_exe, &[output_path_str], None, None)
        .context("Failed to spawn spatialshot UI.")?;

    Ok(())
}
