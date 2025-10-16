
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
