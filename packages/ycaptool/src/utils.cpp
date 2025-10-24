#include "utils.h"
#include <QGuiApplication>
#include <QScreen>
#include <QDebug>
#include <QProcess>
#include <QJsonDocument>
#include <QJsonArray>
#include <QJsonObject>

QRect desktopGeometry() {
    QRect geometry;
    for (QScreen* const screen : QGuiApplication::screens()) {
        qreal dpr = screen->devicePixelRatio();
        QRect scrRect = screen->geometry();
        scrRect.moveTo(QPoint(static_cast<int>(scrRect.x() * dpr), static_cast<int>(scrRect.y() * dpr)));
        scrRect.setSize(scrRect.size() * dpr);
        geometry = geometry.united(scrRect);
    }
    return geometry;
}

QRect logicalDesktopGeometry() {
    QRect geometry;
    for (QScreen* const screen : QGuiApplication::screens()) {
        QRect scrRect = screen->geometry();
        scrRect.moveTo(scrRect.x(), scrRect.y());
        geometry = geometry.united(scrRect);
    }
    return geometry;
}

bool processFullPixmap(const QPixmap& fullDesktop) {
    if (fullDesktop.isNull()) {
        return false;
    }
    QRect approxPhysGeo = desktopGeometry();
    QRect logicalGeo = logicalDesktopGeometry();
    qreal effectiveDpr;
    if (fullDesktop.size() == approxPhysGeo.size()) {
        effectiveDpr = qApp->primaryScreen()->devicePixelRatio();
    } else if (fullDesktop.size() == logicalGeo.size()) {
        effectiveDpr = 1.0;
    } else {
        effectiveDpr = static_cast<qreal>(fullDesktop.height()) / logicalGeo.height();
    }
    QPixmap mutableFull = fullDesktop;
    mutableFull.setDevicePixelRatio(effectiveDpr);
    QList<QScreen*> screens = qApp->screens();
    qDebug() << "Found" << screens.count() << "screen(s). Cropping...";
    QPoint minTopLeft(0, 0);
    for (QScreen* screen : screens) {
        QPoint tl = screen->geometry().topLeft();
        if (tl.x() < minTopLeft.x()) minTopLeft.setX(tl.x());
        if (tl.y() < minTopLeft.y()) minTopLeft.setY(tl.y());
    }
    int i = 1;
    bool success = true;
    for (QScreen* screen : screens) {
        QRect geometry = screen->geometry();
        geometry.translate(-minTopLeft.x(), -minTopLeft.y());
        QRect adjustedGeo(geometry.topLeft() * effectiveDpr, geometry.size() * effectiveDpr);
        qDebug() << "Screen" << i << "adjusted geometry:" << adjustedGeo;
        QPixmap cropped = mutableFull.copy(adjustedGeo);
        QString saveName = QString("%1.png").arg(i);
        if (!cropped.save(saveName)) {
            qWarning() << "Failed to save" << saveName;
            success = false;
        } else {
            qDebug() << "Saved" << saveName;
        }
        i++;
    }
    return success;
}

bool tryWlroots() {
    qDebug() << "Trying wlroots fallback with grim and wlr-randr...";
    QProcess proc;
    proc.start("wlr-randr", QStringList() << "--json");
    if (!proc.waitForFinished() || proc.exitCode() != 0) {
        qWarning() << "wlr-randr failed to execute or returned error.";
        return false;
    }
    QByteArray output = proc.readAllStandardOutput();
    QJsonDocument doc = QJsonDocument::fromJson(output);
    if (!doc.isArray()) {
        qWarning() << "wlr-randr output is not a JSON array.";
        return false;
    }
    QJsonArray monitors = doc.array();
    if (monitors.isEmpty()) {
        qWarning() << "No monitors found in wlr-randr output.";
        return false;
    }
    int i = 1;
    bool success = true;
    for (const QJsonValue &val : monitors) {
        QJsonObject mon = val.toObject();
        if (mon["active"].toBool(true)) {
            QString name = mon["name"].toString();
            if (name.isEmpty()) continue;
            QString fileName = QString("%1.png").arg(i);
            qDebug() << "Capturing monitor" << name << "to" << fileName;
            QProcess grimProc;
            grimProc.start("grim", QStringList() << "-o" << name << fileName);
            if (!grimProc.waitForFinished() || grimProc.exitCode() != 0) {
                qWarning() << "grim failed for monitor" << name;
                success = false;
            } else {
                qDebug() << "Saved" << fileName;
            }
            i++;
        }
    }
    return success;
}
