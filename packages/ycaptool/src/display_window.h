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

#ifndef DISPLAY_WINDOW_H
#define DISPLAY_WINDOW_H

#include <gtkmm.h>

class MultiDisplaySelector;

class DisplayWindow : public Gtk::Window
{
public:
    DisplayWindow(int monitor_index, const Gdk::Rectangle &geometry, MultiDisplaySelector *selector);
    int get_monitor_index() const { return m_monitor_index; }

protected:
    bool on_button_press(GdkEventButton *event);
    void on_cancel_clicked();
    void on_select_clicked();

private:
    void apply_css();
    void center_on_monitor(const Gdk::Rectangle &geometry);

    int m_monitor_index;
    MultiDisplaySelector *m_selector;
    Gtk::EventBox m_event_box;
};

#endif // DISPLAY_WINDOW_H
