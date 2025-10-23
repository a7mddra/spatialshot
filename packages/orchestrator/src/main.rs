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

use anyhow::{Context, Result};
use core_affinity;
use log::{error, LevelFilter};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

mod platform;
mod shared;

fn main() -> Result<()> {
    env_logger::Builder::new()
        .filter_level(LevelFilter::Error)
        .format_timestamp(None)
        .format_target(false)
        .init();

    let core_ids = core_affinity::get_core_ids().context("Failed to get CPU core IDs")?;
    if core_ids.len() < 2 {
        error!("This application requires at least 2 CPU cores for optimal performance.");
    }
    let monitor_core = core_ids[0];
    let sequence_core = core_ids.get(1).copied().unwrap_or(monitor_core);
    let display_monitor_core = core_ids.get(2).copied().unwrap_or(monitor_core);

    let paths = shared::find_app_paths().context("Failed to determine application paths")?;

    let initial_count = platform::get_monitor_count()
        .context("Failed to get initial monitor count")?;

    let (tx, rx) = mpsc::channel::<shared::MonitorEvent>();

    let monitor_paths = paths.clone();
    let _monitor_handle = thread::Builder::new()
        .name("monitor_thread".into())
        .spawn(move || {
            if !core_affinity::set_for_current(monitor_core) {
                error!(
                    "[MONITOR] Failed to pin monitor thread to core {:?}",
                    monitor_core
                );
            }
            let is_wayland = cfg!(target_os = "linux") && platform::is_wayland();
            let expected_monitors = if is_wayland {
                1
            } else {
                initial_count
            };
            shared::monitor_tmp_directory(tx, monitor_paths, is_wayland, expected_monitors);
        })
        .context("Failed to spawn monitor thread")?;

    let sequence_paths = paths.clone();
    let _sequence_handle = thread::Builder::new()
        .name("sequence_thread".into())
        .spawn(move || -> Result<()> {
            if !core_affinity::set_for_current(sequence_core) {
                error!(
                    "[SEQ] Failed to pin sequence thread to core {:?}",
                    sequence_core
                );
            }
            platform::run(rx, &sequence_paths)
        })
        .context("Failed to spawn sequence thread")?;

    let display_monitor_paths = paths.clone();
    let _display_monitor_handle = thread::Builder::new()
        .name("display_monitor_thread".into())
        .spawn(move || {
            if !core_affinity::set_for_current(display_monitor_core) {
                error!(
                    "[DISPLAY_MON] Failed to pin display monitor thread to core {:?}",
                    display_monitor_core
                );
            }
            monitor_display_changes(initial_count, &display_monitor_paths);
        })
        .context("Failed to spawn display monitor thread")?;

    match _sequence_handle.join() {
        Ok(Ok(())) => Ok(()),
        Ok(Err(e)) => {
            error!("Orchestration failed: {:?}", e);
            Err(e)
        }
        Err(panic_payload) => {
            let msg = if let Some(s) = panic_payload.downcast_ref::<&str>() {
                *s
            } else if let Some(s) = panic_payload.downcast_ref::<String>() {
                s.as_str()
            } else {
                "Sequence thread panicked with unknown payload"
            };
            error!("Critical error: {}", msg);
            anyhow::bail!("Sequence thread panicked.")
        }
    }
}

fn monitor_display_changes(initial_count: u32, paths: &shared::AppPaths) {
    loop {
        match platform::get_monitor_count() {
            Ok(current_count) => {
                if current_count != initial_count {
                    error!("[DISPLAY_MON] Monitor count changed from {} to {}. Shutting down.", initial_count, current_count);
                    let _ = platform::kill_running_packages(paths);
                    std::process::exit(1);
                }
            }
            Err(e) => error!("[DISPLAY_MON] Failed to get monitor count: {:?}", e),
        }
        thread::sleep(Duration::from_secs(1));
    }
}
