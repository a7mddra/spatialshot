#!/usr/bin/env python3
"""
selector.py
Creates one small selector window centered on each monitor.
Clicking "Cap here" returns the display number.
"""
import os
import sys
from pathlib import Path

try:
    import gi
    gi.require_version("Gtk", "3.0")
    from gi.repository import Gtk, Gdk
except Exception as e:
    print("This script requires PyGObject (GTK3). Install python3-gi and gir1.2-gtk-3.0.", file=sys.stderr)
    print("Error:", e, file=sys.stderr)
    sys.exit(1)


class MonitorWindow:
    def __init__(self, monitor_index: int, geometry: Gdk.Rectangle, selector):
        self.monitor_index = monitor_index
        self.geometry = geometry
        self.display_num = monitor_index + 1
        self.selector = selector 

        self.window = Gtk.Window(title=f"Cap: Display {self.display_num}")
        self.window.set_default_size(220, 110)
        self.window.set_decorated(False)
        self.window.set_resizable(False)
        self.window.set_keep_above(True)
        
        self.window.set_opacity(0.95)

        v = Gtk.VBox(spacing=6)
        v.set_border_width(8)

        label = Gtk.Label()
        label.set_markup(f"<b>Display {self.display_num}</b>")
        label.set_justify(Gtk.Justification.CENTER)
        v.pack_start(label, False, False, 0)

        self.status = Gtk.Label(label="Ready")
        v.pack_end(self.status, False, False, 0)

        btn = Gtk.Button(label="Cap here")
        btn.connect("clicked", self.on_click)
        v.pack_start(btn, True, True, 0)

        quit_btn = Gtk.Button(label="Quit")
        quit_btn.connect("clicked", self.on_quit)
        v.pack_end(quit_btn, False, False, 0)

        self.window.add(v)
        self.window.show_all()

        self.center_on_monitor()

    def center_on_monitor(self):
        g = self.geometry
        win_w, win_h = self.window.get_size()
        pos_x = g.x + max(0, (g.width - win_w) // 2)
        pos_y = g.y + max(0, (g.height - win_h) // 2)
        self.window.move(pos_x, pos_y)

    def set_status(self, text: str):
        self.status.set_text(text)

    def hide_immediately(self):
        self.window.hide()

    def on_click(self, _btn):
        self.set_status(f"Selected display {self.display_num}")
        
        self.selector.hide_all_windows()
        
        print(self.display_num)
        sys.stdout.flush()
        
        sys.exit(0)

    def on_quit(self, _btn):
        self.selector.hide_all_windows()
        sys.exit(1)


class DisplaySelector:
    def __init__(self):
        self.windows = []
    
    def hide_all_windows(self):
        for window in self.windows:
            window.hide_immediately()
        while Gtk.events_pending():
            Gtk.main_iteration()
    
    def build_selector(self):
        display = Gdk.Display.get_default()
        n_mon = display.get_n_monitors()
        
        if n_mon == 0:
            print("Error: No monitors detected", file=sys.stderr)
            sys.exit(1)
            
        for i in range(n_mon):
            monitor = display.get_monitor(i)
            geom = monitor.get_geometry()
            mw = MonitorWindow(i, geom, self)
            self.windows.append(mw)

        Gtk.main()


if __name__ == "__main__":
    try:
        selector = DisplaySelector()
        selector.build_selector()
    except KeyboardInterrupt:
        selector.hide_all_windows()
        sys.exit(1)
    except Exception as e:
        print(f"Selector error: {e}", file=sys.stderr)
        sys.exit(1)
