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

MultiDisplaySelector::MultiDisplaySelector() = default;

void MultiDisplaySelector::run()
{
    auto display = Gdk::Display::get_default();
    if (!display)
    {
        std::cerr << "Cannot open display." << std::endl;
        return;
    }
    int num_monitors = display->get_n_monitors();

    for (int i = 0; i < num_monitors; ++i)
    {
        auto monitor = display->get_monitor(i);
        if (monitor)
        {
            Gdk::Rectangle geometry;
            monitor->get_geometry(geometry);
            auto win = new DisplayWindow(i, geometry, this);
            m_windows.push_back(win);
        }
    }
    Gtk::Main::run();
}

void MultiDisplaySelector::apply_action(DisplayWindow *selected_window)
{
    for (auto window : m_windows)
    {
        if (window == selected_window)
        {
            window->set_opacity(0.0);
            Glib::signal_idle().connect([window]() -> bool
            {
                run_ycap_cli(window->get_monitor_index() + 1);
                window->hide();
                window->close();
                return false; 
            });
        }
        else
        {
            Glib::signal_idle().connect([window]() -> bool
            {
                window->close();
                return false;
            });
        }
    }

    Glib::signal_timeout().connect([]() -> bool
    {
        Gtk::Main::quit();
        return false;
    }, 10);
}

void MultiDisplaySelector::quit_normally()
{
    for (auto window : m_windows)
    {
        window->close();
    }
    Gtk::Main::quit();
}
