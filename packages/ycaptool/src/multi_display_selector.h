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

#ifndef MULTI_DISPLAY_SELECTOR_H
#define MULTI_DISPLAY_SELECTOR_H

#include "display_window.h"
#include <vector>

class MultiDisplaySelector
{
public:
    MultiDisplaySelector();
    void run();
    void apply_action(DisplayWindow *selected_window);
    void quit_normally();

private:
    std::vector<DisplayWindow *> m_windows;
};

#endif // MULTI_DISPLAY_SELECTOR_H
