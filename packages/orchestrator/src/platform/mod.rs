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

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use self::linux::{get_monitor_count, run};

#[cfg(target_os = "windows")]
mod win32;
#[cfg(target_os = "windows")]
pub use self::win32::{get_monitor_count, run};

#[cfg(target_os = "macos")]
mod darwin;
#[cfg(target_os = "macos")]
pub use self::darwin::{get_monitor_count, run};

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
pub fn run(
    _rx: std::sync::mpsc::Receiver<crate::shared::MonitorEvent>,
    _paths: &crate::shared::AppPaths,
) -> anyhow::Result<()> {
    anyhow::bail!("This platform is not currently supported by SpatialShot.");
}
#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
pub fn get_monitor_count() -> anyhow::Result<u32> {
    Ok(1)
}

#[cfg(target_os = "linux")]
pub fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
        || std::env::var("XDG_SESSION_TYPE")
            .map(|s| s.eq_ignore_ascii_case("wayland"))
            .unwrap_or(false)
}
#[cfg(not(target_os = "linux"))]
pub fn is_wayland() -> bool {
    false
}
