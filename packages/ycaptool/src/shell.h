#include <string>

class Shell {
public:
    static std::string run_and_get_output(const std::string &cmd);
    static int run_silent(const std::string &cmd);
    static bool command_exists(const std::string &cmd_name);
};
