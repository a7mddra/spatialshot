
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
