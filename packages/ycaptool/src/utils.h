#include <QRect>
#include <QPixmap>

QRect desktopGeometry();
QRect logicalDesktopGeometry();
bool processFullPixmap(const QPixmap& fullDesktop);
bool tryWlroots();
