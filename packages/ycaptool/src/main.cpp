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

#include "multi_display_selector.h"
#include "capture.h"
#include <iostream>
#include <string>
#include <memory>
#include <array>
#include <stdexcept>
#include <cstdio>
#include <gio/gio.h>
#include <unistd.h>
#include <sys/stat.h>
#include <cstdlib>
#include <cstring>

static std::string extract_resource_to_temp(const char *resource_path)
{
    GError *error = nullptr;
    GBytes *bytes = g_resources_lookup_data(resource_path, G_RESOURCE_LOOKUP_FLAGS_NONE, &error);
    if (!bytes)
    {
        if (error)
        {
            std::cerr << "Resource lookup failed for " << resource_path << ": " << error->message << std::endl;
            g_error_free(error);
        }
        return "";
    }

    gsize size = 0;
    const void *data = g_bytes_get_data(bytes, &size);

    char temp_template[] = "/tmp/ycap-XXXXXX";
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

    if (chmod(temp_template, 0700) != 0)
    {
        std::cerr << "chmod failed on temp file: " << strerror(errno) << std::endl;
        unlink(temp_template);
        return "";
    }

    return std::string(temp_template);
}

int get_monitor_count()
{
    std::string script_path = extract_resource_to_temp("/org/spatialshot/ycaptool/bin/hm-monitors.sh");
    if (script_path.empty())
    {
        std::cerr << "Could not extract hm-monitors.sh script, falling back to 1 monitor." << std::endl;
        return 1;
    }

    std::string result;
    std::array<char, 128> buffer;
    std::string cmd = script_path + " 2>/dev/null";
    std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(cmd.c_str(), "r"), pclose);

    if (!pipe)
    {
        std::cerr << "popen() failed for monitor script, falling back to 1 monitor." << std::endl;
        unlink(script_path.c_str());
        return 1;
    }

    while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr)
    {
        result += buffer.data();
    }

    unlink(script_path.c_str());

    try
    {
        result.erase(0, result.find_first_not_of(" \n\r\t"));
        result.erase(result.find_last_not_of(" \n\r\t") + 1);
        if (result.empty()) return 1;
        return std::stoi(result);
    }
    catch (const std::exception &e)
    {
        std::cerr << "Failed to parse monitor count from script output: '" << result << "'. Falling back to 1." << std::endl;
        return 1;
    }
}

int main(int argc, char *argv[])
{
    if (argc == 2 && std::string(argv[1]) == "--version")
    {
        std::cout << "ycaptool 1.0.0" << std::endl;
        return 0;
    }

    int monitor_count = get_monitor_count();

    if (monitor_count > 1)
    {
        try
        {
            Gtk::Main kit(argc, argv);
            MultiDisplaySelector selector;
            selector.run();
        }
        catch (const Glib::Error &e)
        {
            std::cerr << "An error occurred: " << e.what() << std::endl;
            return 1;
        }
    }
            else
            {
                capture_screen(1);
            }
    return 0;
}
