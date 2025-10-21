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
#include "ycap_cli_runner.h"
#include <iostream>

int main(int argc, char *argv[])
{
    if (argc == 2 && std::string(argv[1]) == "--version")
    {
        std::cout << "ycaptool 1.0.0" << std::endl;
        return 0;
    }

    if (argc == 2 && std::string(argv[1]) == "--multi")
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
        return 0;
    }

    if (argc == 1)
    {
        run_ycap_cli(0);
        return 0;
    }

    std::cerr << "Usage: " << argv[0] << " [--multi|--version]" << std::endl;
    std::cerr << "  --multi    Capture a specific display" << std::endl;
    std::cerr << "  --version  Show version information" << std::endl;
    std::cerr << "  no args    Capture current screen" << std::endl;
    return 1;
}
