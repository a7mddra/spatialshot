#include "MainWindow.h"
#include <QApplication>
#include <QCommandLineParser>
#include <QScreen>
#include <QDir>
#include <QDebug>

int main(int argc, char *argv[]) {
#ifdef Q_OS_LINUX
    qputenv("QT_QPA_PLATFORM", "xcb");
#endif

    QApplication app(argc, argv);
    app.setApplicationName("spatialshot-squiggle");
    app.setApplicationVersion("1.0.0");

    QCommandLineParser parser;
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("monitor", "Monitor number (optional, e.g., -- 2)", "[-- monitor]");
    parser.process(app);
    const QStringList args = parser.positionalArguments();
    int monitorArg = args.isEmpty() ? -1 : args.first().toInt();

    QString tmpPath;
#ifdef Q_OS_WIN
    tmpPath = QDir::home().filePath("AppData/Roaming/spatialshot/tmp");
#else
    tmpPath = QDir::home().filePath(".config/spatialshot/tmp");
#endif
    QDir(tmpPath).mkpath(".");

    const QList<QScreen*> screens = QGuiApplication::screens();
    QMap<int, int> monitorMapping; 
    int monitorNumber = 1;
    int primaryIndex = screens.indexOf(QGuiApplication::primaryScreen());
    if (primaryIndex < 0) primaryIndex = 0; 
    monitorMapping[primaryIndex] = monitorNumber++; 
    for (int i = 0; i < screens.size(); ++i) {
        if (i != primaryIndex) {
            monitorMapping[i] = monitorNumber++; 
        }
    }

    qDebug() << "Available displays:";
    for (int i = 0; i < screens.size(); ++i) {
        QScreen* screen = screens[i];
        qDebug() << QString("Display %1: %2, bounds: %3x%4+%5+%6, primary: %7")
                    .arg(monitorMapping[i])
                    .arg(screen->name().isEmpty() ? "Unnamed" : screen->name())
                    .arg(screen->geometry().width())
                    .arg(screen->geometry().height())
                    .arg(screen->geometry().x())
                    .arg(screen->geometry().y())
                    .arg(screen == QGuiApplication::primaryScreen());
    }

    QList<int> targetIndexes;
    if (monitorArg > 0 && monitorMapping.values().contains(monitorArg)) {
        int qtIndex = monitorMapping.key(monitorArg);
        if (qtIndex < screens.size()) {
            targetIndexes.append(qtIndex);
        } else {
            qDebug() << "Invalid monitor index" << monitorArg << ", falling back to primary (1).";
            targetIndexes.append(primaryIndex);
        }
    } else {
        targetIndexes = monitorMapping.keys();
    }

    QList<MainWindow*> windows;
    for (int index : targetIndexes) {
        QScreen* screen = screens[index];
        QString imagePath = QDir(tmpPath).filePath(QString("%1.png").arg(monitorMapping[index]));
        if (!QFileInfo(imagePath).exists()) {
            qWarning() << "PNG not found:" << imagePath;
            continue;
        }
        MainWindow* win = new MainWindow(monitorMapping[index], imagePath, screen);
        windows.append(win);
        win->show();
    }

    if (windows.isEmpty()) {
        qWarning() << "No valid monitors or PNGs found, exiting.";
        return 1;
    }

    return app.exec();
}
