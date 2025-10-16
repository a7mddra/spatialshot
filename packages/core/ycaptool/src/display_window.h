
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
