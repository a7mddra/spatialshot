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

#include "display_window.h"
#include "multi_display_selector.h"
#include <iostream>

DisplayWindow::DisplayWindow(int monitor_index, const Gdk::Rectangle &geometry, MultiDisplaySelector *selector)
    : m_monitor_index(monitor_index), m_selector(selector)
{

    set_default_size(180, 140);
    set_resizable(false);
    set_decorated(false);
    set_type_hint(Gdk::WINDOW_TYPE_HINT_DIALOG);
    set_keep_above(true);

    m_event_box.add_events(Gdk::BUTTON_PRESS_MASK | Gdk::BUTTON_RELEASE_MASK | Gdk::POINTER_MOTION_MASK);
    m_event_box.signal_button_press_event().connect(sigc::mem_fun(*this, &DisplayWindow::on_button_press));
    signal_delete_event().connect(sigc::mem_fun(*this, &DisplayWindow::on_delete_event));
    add(m_event_box);

    auto outer = Gtk::make_managed<Gtk::Box>(Gtk::ORIENTATION_VERTICAL, 0);
    outer->set_border_width(0);
    m_event_box.add(*outer);

    auto top_spacer = Gtk::make_managed<Gtk::Box>();
    top_spacer->set_vexpand(true);
    outer->pack_start(*top_spacer, true, true, 0);

    auto content_box = Gtk::make_managed<Gtk::Box>(Gtk::ORIENTATION_VERTICAL, 2);
    content_box->set_border_width(10);
    outer->pack_start(*content_box, false, false, 0);

    auto title_top_spacer = Gtk::make_managed<Gtk::Box>();
    title_top_spacer->set_size_request(-1, 10);
    content_box->pack_start(*title_top_spacer, false, false, 0);

    auto title_row = Gtk::make_managed<Gtk::Box>(Gtk::ORIENTATION_HORIZONTAL, 8);
    title_row->set_halign(Gtk::ALIGN_CENTER);
    title_row->set_margin_bottom(10);
    content_box->pack_start(*title_row, false, false, 0);

    auto logo_file = "/org/spatialshot/ycaptool/assets/logo.svg";
    try
    {
        auto pixbuf = Gdk::Pixbuf::create_from_resource(logo_file, 50, 50);
        auto icon = Gtk::make_managed<Gtk::Image>(pixbuf);
        icon->set_name("icon");
        icon->set_size_request(24, 24);
        title_row->pack_start(*icon, false, false, 0);
    }
    catch (const Glib::Error &e)
    {
        std::cerr << "Failed to load icon from resource: " << e.what() << std::endl;
    }

    auto title = Gtk::make_managed<Gtk::Label>("Choose a Display");
    title->set_name("title");
    title->set_xalign(0.0);
    title->get_style_context()->add_class("dialog-title");
    title_row->pack_start(*title, false, false, 0);

    auto subtitle = Gtk::make_managed<Gtk::Label>("SpatialShot needs to know which screen to use.");
    subtitle->set_name("subtitle");
    subtitle->set_xalign(0.5);
    subtitle->set_margin_bottom(8);
    content_box->pack_start(*subtitle, false, false, 0);

    auto sep = Gtk::make_managed<Gtk::Separator>(Gtk::ORIENTATION_HORIZONTAL);
    sep->set_margin_top(6);
    sep->set_margin_bottom(6);
    content_box->pack_start(*sep, true, true, 0);

    auto actions = Gtk::make_managed<Gtk::Box>(Gtk::ORIENTATION_HORIZONTAL, 8);
    actions->set_halign(Gtk::ALIGN_FILL);
    actions->set_margin_top(4);
    content_box->pack_start(*actions, false, false, 0);

    auto btn_cancel = Gtk::make_managed<Gtk::Button>("Cancel");
    btn_cancel->get_style_context()->add_class("text-button");
    btn_cancel->set_size_request(200, 6);
    btn_cancel->signal_clicked().connect(sigc::mem_fun(*this, &DisplayWindow::on_cancel_clicked));
    actions->pack_start(*btn_cancel, false, false, 0);

    auto spacer = Gtk::make_managed<Gtk::Box>();
    spacer->set_hexpand(true);
    actions->pack_start(*spacer, true, true, 0);

    auto btn_select = Gtk::make_managed<Gtk::Button>("This Display");
    btn_select->get_style_context()->add_class("okay");
    btn_select->set_size_request(200, 6);
    btn_select->signal_clicked().connect(sigc::mem_fun(*this, &DisplayWindow::on_select_clicked));
    actions->pack_end(*btn_select, false, false, 0);

    apply_css();
    show_all();
    center_on_monitor(geometry);
}

void DisplayWindow::apply_css()
{
    auto css_provider = Gtk::CssProvider::create();
    auto css_file = "/org/spatialshot/ycaptool/style.css";
    try
    {
        css_provider->load_from_resource(css_file);
        auto screen = Gdk::Screen::get_default();
        Gtk::StyleContext::add_provider_for_screen(screen, css_provider, GTK_STYLE_PROVIDER_PRIORITY_APPLICATION);
    }
    catch (const Gtk::CssProviderError &e)
    {
        std::cerr << "Failed to load CSS from resource: " << e.what() << std::endl;
    }
}

void DisplayWindow::center_on_monitor(const Gdk::Rectangle &geometry)
{
    int win_w, win_h;
    get_size(win_w, win_h);
    int pos_x = geometry.get_x() + (geometry.get_width() - win_w) / 2;
    int pos_y = geometry.get_y() + (geometry.get_height() - win_h) / 2;
    move(pos_x, pos_y);
}

bool DisplayWindow::on_button_press(GdkEventButton *event)
{
    if (event->button == 1)
    {
        if (auto gdk_window = get_window())
        {
            gdk_window->begin_move_drag(
                event->button,
                (int)event->x_root,
                (int)event->y_root,
                event->time);
        }
        return true;
    }
    return false;
}

void DisplayWindow::on_cancel_clicked()
{
    m_selector->quit_with_error();
}

void DisplayWindow::on_select_clicked()
{
    m_selector->apply_action(this);
}

bool DisplayWindow::on_delete_event(GdkEventAny* event)
{
    m_selector->quit_with_error();
    return true;
}
