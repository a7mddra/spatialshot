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

#ifndef YCAP_SHELL_H
#define YCAP_SHELL_H

#include <string>

namespace Shell
{
    std::string run_and_get_output(const std::string &cmd);
    int run_silent(const std::string &cmd);
    bool command_exists(const std::string &cmd_name);
}

#endif //YCAP_SHELL_H
