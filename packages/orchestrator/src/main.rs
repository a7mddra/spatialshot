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

use std::sync::mpsc;
use std::thread;
use anyhow::{Context, Result};
use crate::shared::{clear_tmp, monitor_tmp_directory, ProjectPaths};

mod shared;
mod platform;

fn main() -> Result<()> {
    println!("♦ SpatialShot Orchestrator Starting ♦");

    // --- Setup Core Affinity ---
    let core_ids = core_affinity::get_core_ids().context("Failed to get CPU core IDs.")?;
    if core_ids.len() < 2 {
        println!("[WARN] Less than 2 CPU cores detected. Running on a single thread.");
    }
    let monitor_core = core_ids.get(0).cloned();
    let sequence_core = core_ids.get(1).cloned();

    // --- Setup Paths ---
    let tmp_dir = dirs::config_dir()
        .context("Could not find config directory.")?
        .join("spatialshot/tmp");

    // This logic assumes a development build layout.
    // For production, paths would be relative to the executable.
    let base_path = env::current_exe()?.ancestors().nth(4).context("Could not find project root.")?.to_path_buf();
    
    let paths = ProjectPaths {
        tmp_dir,
        squiggle_bin: base_path.join("packages/squiggle/dist/spatialshot-squiggle"),
        ycaptool_bin: base_path.join("packages/ycaptool/bin/ycaptool"),
        spatialshot_dir: base_path.join("packages/spatialshot"),
    };

    // --- Setup Threading ---
    let (tx, rx) = mpsc::channel();
    let monitor_paths = paths // Clone paths for the monitor thread
    let monitor_thread = thread::Builder::new().name("monitor_thread".into()).spawn(move || {
        if let Some(core) = monitor_core {
            core_affinity::set_for_current(core);
        }
        let is_wayland = cfg!(target_os = "linux") && env::var("WAYLAND_DISPLAY").is_ok();
        let monitor_count = platform::get_monitor_count().unwrap_or(1);
        monitor_tmp_directory(tx, monitor_paths, is_wayland, monitor_count);
    })?;

    // --- Pin Main Thread and Run Sequence ---
    if let Some(core) = sequence_core {
        core_affinity::set_for_current(core);
    }
    println!("[SEQ] Running on core {:?}", core_affinity::get_core_ids().unwrap()[0]);

    // Clear tmp directory before starting
    clear_tmp(&paths.tmp_dir)?;
    
    // The main sequence blocks here, waiting for events from the monitor thread.
    let run_result = platform::run(rx, &paths);

    // --- Cleanup ---
    if let Err(e) = &run_result {
        eprintln!("[ERROR] Orchestrator sequence failed: {:?}", e);
    }
    
    println!("♦ SpatialShot Session Complete ♦");
    // The monitor thread will exit automatically when the sender (tx) is dropped.
    // We can optionally wait for it to finish.
    monitor_thread.join().expect("Monitor thread panicked.");
    
    run_result?;
    Ok(())
}
