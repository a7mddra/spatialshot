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

// ... (includes and consts remain the same) ...

/// The main sequence for Linux.
pub fn run(rx: Receiver<MonitorEvent>, paths: &ProjectPaths) -> Result<()> {
    // ... (Steps 1, 2, and 3 are unchanged) ...

    // Step 4: Wait for monitor thread to confirm squiggle is finished.
    println!("[SEQ] Waiting for squiggle to finish...");
    let ui_monitor: u32;
    let output_png_path: PathBuf; // We'll store the full path here

    match rx.recv()? {
        MonitorEvent::SquiggleFinished(monitor_num) => {
            ui_monitor = monitor_num;
            // --- THIS IS THE FIX ---
            // Construct the full path to the correct output file (e.g., "o2.png")
            output_png_path = paths.tmp_dir.join(format!("o{}.png", ui_monitor));
            println!("[SEQ] Squiggle finished. Launching UI for {}", output_png_path.display());
            // --- END FIX ---
        },
        _ => anyhow::bail!("Received unexpected event while waiting for squiggle output."),
    }

    // Step 5: Launch SpatialShot UI
    println!("[SEQ] Launching spatialshot UI...");
    let mut ui_cmd = Command::new("npm");
    ui_cmd.current_dir(&paths.spatialshot_dir)
          .arg("start")
          .arg("--")
          .arg(output_png_path) // <-- Pass the correct, full path
          .arg(format!("--monitor={}", ui_monitor));
    
    spawn_command(ui_cmd).context("Failed to spawn spatialshot UI.")?;

    Ok(())
}

// ... (get_monitor_count remains the same) ...

