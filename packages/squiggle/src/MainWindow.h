#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QGraphicsView>
#include <QGraphicsScene>
#include <QGraphicsPathItem>
#include <QPainterPath>
#include <QScreen>

class DrawView : public QGraphicsView {
    Q_OBJECT
public:
    explicit DrawView(const QString& imagePath, QWidget* parent = nullptr);
protected:
    void mousePressEvent(QMouseEvent* event) override;
    void mouseMoveEvent(QMouseEvent* event) override;
    void mouseReleaseEvent(QMouseEvent* event) override;
    void keyPressEvent(QKeyEvent* event) override;
    void resizeEvent(QResizeEvent* event) override;
private:
    void updateBounds(qreal x, qreal y);
    void updateBoundsDisplay();
    void clearCanvas();
    void cropAndSave();

    QGraphicsScene* m_scene;
    QGraphicsPathItem* m_pathItem = nullptr;
    QImage m_background; 
    QPainterPath m_path;
    bool m_isDrawing = false;
    bool m_hasDrawing = false;
    
    // --- MODIFIED LINES ---
    QPointF m_smoothedPoint; // Replaces m_lastPoint
    
    // This is your new "smoothness" knob.
    // Lower = smoother, more "lag" (e.g., 0.1)
    // Higher = more responsive, less smooth (e.g., 0.5)
    // 1.0 = no smoothing (raw mouse input)
    const qreal m_smoothingFactor = 0.2; 
    // --- END MODIFIED LINES ---

    qreal m_minX, m_maxX, m_minY, m_maxY;
    const qreal m_brushSize = 5.0;
    const qreal m_glowAmount = 10.0;
    const QColor m_brushColor = Qt::white;
};

class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    MainWindow(int displayNum, const QString& imagePath, QScreen* screen, QWidget* parent = nullptr);
    int displayNumber() const { return m_displayNum; }
private:
    int m_displayNum;
    DrawView* m_drawView;
};

#endif // MAINWINDOW_H