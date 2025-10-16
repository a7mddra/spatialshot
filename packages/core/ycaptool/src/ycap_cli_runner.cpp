#include "ycap_cli_runner.h"
#include <gio/gio.h>
#include <iostream>
#include <vector>
#include <fcntl.h>
#include <sys/wait.h>
#include <unistd.h>
#include <sys/stat.h>
#include <cerrno>
#include <cstring>

static bool write_executable_from_bytes(const void *buf, gsize size, const std::string &out_path)
{
    int fd = open(out_path.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0700);
    if (fd == -1)
    {
        std::cerr << "write_executable: open failed: " << strerror(errno) << "\n";
        return false;
    }
    const char *p = static_cast<const char *>(buf);
    ssize_t total = 0;
    while (total < (ssize_t)size)
    {
        ssize_t w = write(fd, p + total, size - total);
        if (w <= 0)
        {
            if (errno == EINTR)
                continue;
            std::cerr << "write_executable: write failed: " << strerror(errno) << "\n";
            close(fd);
            return false;
        }
        total += w;
    }
    close(fd);
    if (chmod(out_path.c_str(), 0755) != 0)
    {
        std::cerr << "write_executable: chmod failed: " << strerror(errno) << "\n";
    }
    return true;
}

void run_ycap_cli(int display_number)
{
    auto resource_path = "/org/spatialshot/ycaptool/bin/ycap-cli";
    GError *error = nullptr;
    GBytes *bytes = g_resources_lookup_data(resource_path, G_RESOURCE_LOOKUP_FLAGS_NONE, &error);

    std::string exe_dir = ".";
    {
        char exe_path[PATH_MAX];
        ssize_t count = readlink("/proc/self/exe", exe_path, PATH_MAX);
        if (count != -1)
        {
            std::string tmp(exe_path, count);
            auto pos = tmp.find_last_of('/');
            if (pos != std::string::npos)
                exe_dir = tmp.substr(0, pos);
            else
                exe_dir = tmp;
        }
    }

    std::string out_path = exe_dir + "/ycap-cli";
    bool have_exec = false;

    if (bytes)
    {
        gsize size = 0;
        const guint8 *data = static_cast<const guint8 *>(g_bytes_get_data(bytes, &size));
        if (data && size > 0)
        {
            if (!write_executable_from_bytes(data, size, out_path))
            {
                std::cerr << "Failed to write bundled ycap-cli to " << out_path << "\n";
            }
            else
            {
                have_exec = true;
            }
        }
        g_bytes_unref(bytes);
    }
    else
    {
        if (error)
        {
            std::cerr << "Resource lookup failed: " << error->message << std::endl;
            g_error_free(error);
            error = nullptr;
        }
    }

    if (!have_exec)
    {
        std::string candidate = exe_dir + "/ycap-cli";
        if (access(candidate.c_str(), X_OK) == 0)
        {
            out_path = candidate;
            have_exec = true;
        }
        else
        {
            FILE *f = popen("which ycap-cli 2>/dev/null", "r");
            if (f)
            {
                char buf[PATH_MAX];
                if (fgets(buf, sizeof(buf), f))
                {
                    std::string s(buf);
                    if (!s.empty() && s.back() == '\n')
                        s.pop_back();
                    if (!s.empty())
                    {
                        out_path = s;
                        have_exec = true;
                    }
                }
                pclose(f);
            }
        }
    }

    if (!have_exec)
    {
        std::cerr << "Error: cannot find or extract ycap-cli. Expected resource: "
                  << resource_path << " or bin next to executable." << std::endl;
        return;
    }

    pid_t pid = fork();
    if (pid == -1)
    {
        std::cerr << "fork failed: " << strerror(errno) << std::endl;
        return;
    }
    else if (pid == 0)
    {
        std::vector<char *> argv;
        argv.push_back(const_cast<char *>(out_path.c_str()));
        std::string num;
        if (display_number > 0)
        {
            num = std::to_string(display_number);
            argv.push_back(const_cast<char *>(num.c_str()));
        }
        argv.push_back(nullptr);
        execv(out_path.c_str(), argv.data());
        std::cerr << "execv failed: " << strerror(errno) << std::endl;
        _exit(127);
    }

    else
    {
        int status = 0;
        if (waitpid(pid, &status, 0) == -1)
        {
            std::cerr << "waitpid failed: " << strerror(errno) << std::endl;
            return;
        }
        if (WIFEXITED(status))
        {
            int rc = WEXITSTATUS(status);
            if (rc != 0)
            {
                std::cerr << "ycap-cli exited with code " << rc << std::endl;
            }
        }
        else if (WIFSIGNALED(status))
        {
            std::cerr << "ycap-cli killed by signal " << WTERMSIG(status) << std::endl;
        }
    }
}
