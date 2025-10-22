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

#include "capture.h"
#include "audio_manager.h"
#include "dnd_manager.h"
#include "shell.h"
#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>
#include <unistd.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <cstring>
#include <gio/gio.h>

static std::string extract_resource_to_temp(const char *resource_path)
{
    GError *error = nullptr;
    GBytes *bytes = g_resources_lookup_data(resource_path, G_RESOURCE_LOOKUP_FLAGS_NONE, &error);
    if (!bytes)
    {
        if (error) {
            std::cerr << "Resource lookup failed for " << resource_path << ": " << error->message << std::endl;
            g_error_free(error);
        }
        return "";
    }

    gsize size = 0;
    const void *data = g_bytes_get_data(bytes, &size);

    char temp_template[] = "/tmp/ycap-exec-XXXXXX";
    int fd = mkstemp(temp_template);
    if (fd == -1)
    {
        std::cerr << "mkstemp failed: " << strerror(errno) << std::endl;
        g_bytes_unref(bytes);
        return "";
    }

    ssize_t written = write(fd, data, size);
    close(fd);
    g_bytes_unref(bytes);

    if (written != (ssize_t)size)
    {
        std::cerr << "Failed to write resource to temp file" << std::endl;
        unlink(temp_template);
        return "";
    }

    if (chmod(temp_template, 0755) != 0)
    {
        std::cerr << "chmod failed on temp file: " << strerror(errno) << std::endl;
        unlink(temp_template);
        return "";
    }

    return std::string(temp_template);
}
static std::string get_flameshot_path()
{
    std::string bundled_path = extract_resource_to_temp("/org/spatialshot/ycaptool/bin/flameshot");
    if (!bundled_path.empty())
    {
        return bundled_path;
    }

    if (Shell::command_exists("flameshot"))
    {
        std::string system_path = Shell::run_and_get_output("which flameshot");
        if (!system_path.empty()) {
            std::cerr << "Using system-installed flameshot: " << system_path << std::endl;
            return system_path;
        }
    }

    std::cerr << "Flameshot executable not found." << std::endl;
    return "";
}

void capture_screen(int display_number)
{
    if (display_number < 0)
    {
        std::cerr << "Invalid display number: " << display_number << std::endl;
        return;
    }

    std::string flameshot_path = get_flameshot_path();
    if (flameshot_path.empty())
    {
        return;
    }

    AudioManager audio_manager;
    DndManager dnd_manager;

    audio_manager.mute_audio();
    dnd_manager.enable_dnd();

    std::string cache_base_path;
    const char* xdg_cache_home = std::getenv("XDG_CACHE_HOME");

    if (xdg_cache_home && xdg_cache_home[0] != '\0') {
        cache_base_path = xdg_cache_home;
    } else {
        const char* home_dir = std::getenv("HOME");
        if (home_dir && home_dir[0] != '\0') {
            cache_base_path = std::string(home_dir) + "/.cache";
        } else {
            std::cerr << "Error: Cannot find $XDG_CACHE_HOME or $HOME. Unable to determine cache directory." << std::endl;
            audio_manager.restore_audio();
            dnd_manager.restore_dnd();
            return;
        }
    }

    std::string save_path_str = cache_base_path + "/spatialshot/tmp";
    Shell::run_silent("mkdir -p " + save_path_str);
    std::string output_file = save_path_str + "/" + std::to_string(display_number) + ".png";

    std::string cmd = flameshot_path + " screen -n " + std::to_string(display_number > 0 ? display_number - 1 : 0) + " --path " + output_file;

    int exit_code = Shell::run_silent(cmd);

    if (exit_code != 0)
    {
        std::cerr << "Flameshot capture failed with exit code: " << exit_code << std::endl;
    }
    else
    {
        std::cout << "Saved: " << output_file << std::endl;
    }

    audio_manager.restore_audio();
    dnd_manager.restore_dnd();
}
