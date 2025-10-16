#include <gtkmm.h>
#include <iostream>
#include <vector>
#include <gio/gio.h>
#include <fcntl.h>
#include <sys/wait.h>
#include <unistd.h>
#include <sys/stat.h>
#include <cerrno>
#include <cstring>
#include <string>

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

static bool write_executable_from_bytes(const void *buf, gsize size, const std::string &out_path)
{
    int fd = open(out_path.c_str(), O_WRONLY | O_CREAT | O_TRUNC, 0700);
    if (fd == -1)
    {
        std::cerr << "write_executable: open failed: " << strerror(errno) << "\n";
        return false;
    }
    const char *p = static_cast<const char *>(buf);
    ssize_t total = 0;
    while (total < (ssize_t)size)
    {
        ssize_t w = write(fd, p + total, size - total);
        if (w <= 0)
        {
            if (errno == EINTR)
                continue;
            std::cerr << "write_executable: write failed: " << strerror(errno) << "\n";
            close(fd);
            return false;
        }
        total += w;
    }
    close(fd);
    if (chmod(out_path.c_str(), 0755) != 0)
    {
        std::cerr << "write_executable: chmod failed: " << strerror(errno) << "\n";
    }
    return true;
}

void run_ycap_cli(int display_number)
{
    auto resource_path = "/org/spatialshot/ycaptool/bin/ycap-cli";
    GError *error = nullptr;
    GBytes *bytes = g_resources_lookup_data(resource_path, G_RESOURCE_LOOKUP_FLAGS_NONE, &error);

    std::string exe_dir = ".";
    {
        char exe_path[PATH_MAX];
        ssize_t count = readlink("/proc/self/exe", exe_path, PATH_MAX);
        if (count != -1)
        {
            std::string tmp(exe_path, count);
            auto pos = tmp.find_last_of('/');
            if (pos != std::string::npos)
                exe_dir = tmp.substr(0, pos);
            else
                exe_dir = tmp;
        }
    }

    std::string out_path = exe_dir + "/ycap-cli";
    bool have_exec = false;

    if (bytes)
    {
        gsize size = 0;
        const guint8 *data = static_cast<const guint8 *>(g_bytes_get_data(bytes, &size));
        if (data && size > 0)
        {
            if (!write_executable_from_bytes(data, size, out_path))
            {
                std::cerr << "Failed to write bundled ycap-cli to " << out_path << "\n";
            }
            else
            {
                have_exec = true;
            }
        }
        g_bytes_unref(bytes);
    }
    else
    {
        if (error)
        {
            std::cerr << "Resource lookup failed: " << error->message << std::endl;
            g_error_free(error);
            error = nullptr;
        }
    }

    if (!have_exec)
    {
        std::string candidate = exe_dir + "/ycap-cli";
        if (access(candidate.c_str(), X_OK) == 0)
        {
            out_path = candidate;
            have_exec = true;
        }
        else
        {
            FILE *f = popen("which ycap-cli 2>/dev/null", "r");
            if (f)
            {
                char buf[PATH_MAX];
                if (fgets(buf, sizeof(buf), f))
                {
                    std::string s(buf);
                    if (!s.empty() && s.back() == '\n')
                        s.pop_back();
                    if (!s.empty())
                    {
                        out_path = s;
                        have_exec = true;
                    }
                }
                pclose(f);
            }
        }
    }

    if (!have_exec)
    {
        std::cerr << "Error: cannot find or extract ycap-cli. Expected resource: "
                  << resource_path << " or bin next to executable." << std::endl;
        return;
    }

    pid_t pid = fork();
    if (pid == -1)
    {
        std::cerr << "fork failed: " << strerror(errno) << std::endl;
        return;
    }
    else if (pid == 0)
    {
        std::vector<char *> argv;
        argv.push_back(const_cast<char *>(out_path.c_str()));
        std::string num;
        if (display_number > 0)
        {
            num = std::to_string(display_number);
            argv.push_back(const_cast<char *>(num.c_str()));
        }
        argv.push_back(nullptr);
        execv(out_path.c_str(), argv.data());
        std::cerr << "execv failed: " << strerror(errno) << std::endl;
        _exit(127);
    }

    else
    {
        int status = 0;
        if (waitpid(pid, &status, 0) == -1)
        {
            std::cerr << "waitpid failed: " << strerror(errno) << std::endl;
            return;
        }
        if (WIFEXITED(status))
        {
            int rc = WEXITSTATUS(status);
            if (rc != 0)
            {
                std::cerr << "ycap-cli exited with code " << rc << std::endl;
            }
        }
        else if (WIFSIGNALED(status))
        {
            std::cerr << "ycap-cli killed by signal " << WTERMSIG(status) << std::endl;
        }
    }
}

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
    m_selector->quit_normally();
}

void DisplayWindow::on_select_clicked()
{
    m_selector->apply_action(this);
}

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
