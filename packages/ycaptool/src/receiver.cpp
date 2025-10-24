#include "receiver.h"
#include <QDebug>
#include <QUrl>
#include <QFile>
#include <QPixmap>
#include "utils.h"

void Receiver::handleResponse(uint response, const QVariantMap& results) {
    bool ok = true;
    if (response != 0) {
        qWarning() << "Portal request failed or was cancelled. Response:" << response;
        ok = false;
    } else {
        QString uri = results.value("uri").toString();
        if (uri.isEmpty()) {
            qWarning() << "Portal did not return a URI.";
            ok = false;
        } else {
            QString fullImagePath = QUrl(uri).toLocalFile();
            qDebug() << "Full desktop image saved to:" << fullImagePath;
            QPixmap fullDesktop(fullImagePath);
            QFile::remove(fullImagePath);
            if (fullDesktop.isNull()) {
                qWarning() << "Failed to load pixmap from" << fullImagePath;
                ok = false;
            } else {
                ok = processFullPixmap(fullDesktop);
            }
        }
    }
    qDebug() << (ok ? "--- Capture Complete ---" : "--- Capture Failed ---");
    emit finished(ok);
}
