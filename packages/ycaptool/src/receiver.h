#include <QObject>
#include <QVariantMap>

class Receiver : public QObject {
    Q_OBJECT
public slots:
    void handleResponse(uint response, const QVariantMap& results);
signals:
    void finished(bool success);
};
