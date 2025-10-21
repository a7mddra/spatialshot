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

#include "dnd_manager.h"
#include "shell.h"
#include <iostream>

DndManager::DndManager() = default;

bool DndManager::check_gsettings()
{
    std::string out = Shell::run_and_get_output("gsettings get org.gnome.desktop.notifications show-banners");
    return out.find("true") != std::string::npos;
}

bool DndManager::check_dunstctl()
{
    std::string out = Shell::run_and_get_output("dunstctl is-paused");
    return out.find("false") != std::string::npos;
}

bool DndManager::check_qdbus()
{
    std::string out = Shell::run_and_get_output("qdbus org.kde.plasmashell /org/kde/NotificationManager org.kde.NotificationManager.notificationsEnabled");
    return out.find("true") != std::string::npos;
}

void DndManager::enable_dnd()
{
    if (Shell::command_exists("gsettings"))
    {
        m_backend = "gsettings";
        m_initial_state_is_on = check_gsettings();
        if (m_initial_state_is_on)
        {
            Shell::run_silent("gsettings set org.gnome.desktop.notifications show-banners false");
            m_dnd_enabled_by_script = true;
        }
    }
    else if (Shell::command_exists("dunstctl"))
    {
        m_backend = "dunstctl";
        m_initial_state_is_on = check_dunstctl();
        if (m_initial_state_is_on)
        {
            Shell::run_silent("dunstctl set-paused true");
            m_dnd_enabled_by_script = true;
        }
    }
    else if (Shell::command_exists("qdbus"))
    {
        m_backend = "qdbus";
        m_initial_state_is_on = check_qdbus();
        if (m_initial_state_is_on)
        {
            Shell::run_silent("qdbus org.kde.plasmashell /org/kde/NotificationManager org.kde.NotificationManager.setNotificationsEnabled false");
            m_dnd_enabled_by_script = true;
        }
    }
    else
    {
        std::cerr << "No DND backend (gsettings, dunstctl, qdbus) found." << std::endl;
    }
}

void DndManager::restore_dnd()
{
    if (!m_dnd_enabled_by_script || !m_initial_state_is_on) return;

    if (m_backend == "gsettings")
    {
        Shell::run_silent("gsettings set org.gnome.desktop.notifications show-banners true");
    }
    else if (m_backend == "dunstctl")
    {
        Shell::run_silent("dunstctl set-paused false");
    }
    else if (m_backend == "qdbus")
    {
        Shell::run_silent("qdbus org.kde.plasmashell /org/kde/NotificationManager org.kde.NotificationManager.setNotificationsEnabled true");
    }
}
