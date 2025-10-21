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

#ifndef DND_MANAGER_H
#define DND_MANAGER_H

#include <string>

class DndManager
{
public:
    DndManager();
    void enable_dnd();
    void restore_dnd();

private:
    std::string m_backend;
    bool m_initial_state_is_on = false;
    bool m_dnd_enabled_by_script = false;

    bool check_gsettings();
    bool check_dunstctl();
    bool check_qdbus();
};

#endif // DND_MANAGER_H
