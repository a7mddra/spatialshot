#include "MainWindow.h"
#include <QApplication>
#include <QImage>
#include <QMouseEvent>
#include <QPainter>
#include <QProcess>
#include <QDebug>
#include <QDir>
#include <QGraphicsPixmapItem>
#include <QGraphicsDropShadowEffect>

DrawView::DrawView(const QString& imagePath, QWidget* parent)
    : QGraphicsView(parent), m_background(imagePath), m_smoothedPoint(0,0) { 
    
    m_scene = new QGraphicsScene(this);
    setScene(m_scene);
    m_scene->addPixmap(QPixmap::fromImage(m_background));

    setMouseTracking(true);
    setCursor(Qt::CrossCursor);
    setHorizontalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    setFrameShape(QFrame::NoFrame);
    
    clearCanvas();
}

void DrawView::mousePressEvent(QMouseEvent* event) {
    if (event->button() == Qt::LeftButton) {
        if (m_hasDrawing) clearCanvas();
        m_isDrawing = true;
        
        QPointF currentPoint = mapToScene(event->pos());
        m_smoothedPoint = currentPoint; 
        
        m_path.moveTo(m_smoothedPoint);
        updateBounds(m_smoothedPoint.x(), m_smoothedPoint.y());
        
        m_pathItem = new QGraphicsPathItem();
        m_pathItem->setPen(QPen(m_brushColor, m_brushSize, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin));

        QGraphicsDropShadowEffect* glow = new QGraphicsDropShadowEffect();
        glow->setBlurRadius(m_glowAmount * 2); 
        glow->setColor(m_brushColor);
        glow->setOffset(0, 0); 
        m_pathItem->setGraphicsEffect(glow);

        m_scene->addItem(m_pathItem);
    }
}

void DrawView::mouseMoveEvent(QMouseEvent* event) {
    if (!m_isDrawing) return;

    
    QPointF currentPoint = mapToScene(event->pos());

    QPointF newSmoothedPoint = (m_smoothedPoint * (1.0 - m_smoothingFactor)) + (currentPoint * m_smoothingFactor);
    
    QPointF midPoint = (m_smoothedPoint + newSmoothedPoint) / 2.0;
    m_path.quadTo(m_smoothedPoint, midPoint);

    m_pathItem->setPath(m_path);
    
    m_smoothedPoint = newSmoothedPoint;
    
    updateBounds(m_smoothedPoint.x(), m_smoothedPoint.y());
}

void DrawView::mouseReleaseEvent(QMouseEvent* event) {
    if (event->button() == Qt::LeftButton && m_isDrawing) {
        
        m_path.lineTo(m_smoothedPoint);
        m_pathItem->setPath(m_path); 
        
        m_isDrawing = false;
        m_hasDrawing = true;
        
        updateBoundsDisplay();
        cropAndSave();
    }
}

void DrawView::keyPressEvent(QKeyEvent* event) {
    if (event->key() == Qt::Key_Escape || event->key() == Qt::Key_Q) {
        QApplication::quit();
    }
}

void DrawView::resizeEvent(QResizeEvent* event) {
    QGraphicsView::resizeEvent(event);
    fitInView(m_scene->sceneRect(), Qt::IgnoreAspectRatio);
}

void DrawView::updateBounds(qreal x, qreal y) {
    qreal brushRadius = m_brushSize / 2 + m_glowAmount / 2;
    m_minX = qMin(m_minX, x - brushRadius);
    m_maxX = qMax(m_maxX, x + brushRadius);
    m_minY = qMin(m_minY, y - brushRadius);
    m_maxY = qMax(m_maxY, y + brushRadius);
}

void DrawView::updateBoundsDisplay() {
}

void DrawView::clearCanvas() {
    if (m_pathItem) {
        m_scene->removeItem(m_pathItem);
        delete m_pathItem;
        m_pathItem = nullptr;
    }
    m_path = QPainterPath();
    m_isDrawing = false;
    m_hasDrawing = false;
    m_minX = m_background.width();
    m_maxX = 0;
    m_minY = m_background.height();
    m_maxY = 0;
}

void DrawView::cropAndSave() {
    qreal width = m_maxX - m_minX;
    qreal height = m_maxY - m_minY;
    qreal clampedX = qMax(0.0, m_minX);
    qreal clampedY = qMax(0.0, m_minY);
    qreal clampedWidth = qMin(width, static_cast<qreal>(m_background.width()) - clampedX);
    qreal clampedHeight = qMin(height, static_cast<qreal>(m_background.height()) - clampedY);

    if (clampedWidth <= 0 || clampedHeight <= 0) {
        qWarning() << "Invalid crop dimensions, quitting without save";
        QApplication::quit();
        return;
    }

    QString tmpPath = QDir::home().filePath(".config/spatialshot/tmp");
#ifdef Q_OS_WIN
    tmpPath = QDir::home().filePath("AppData/Roaming/spatialshot/tmp");
#endif
    QDir(tmpPath).mkpath(".");
    QString outputPath = QDir(tmpPath).filePath("output.png");

    QImage cropped = m_background.copy(clampedX, clampedY, clampedWidth, clampedHeight);
    if (!cropped.save(outputPath, "PNG")) {
        qWarning() << "Failed to save cropped image:" << outputPath;
        QApplication::quit();
        return;
    }
    qDebug() << "Cropped image saved to:" << outputPath;
    QApplication::quit();
}

MainWindow::MainWindow(int displayNum, const QString& imagePath, QScreen* screen, QWidget* parent)
    : QMainWindow(parent), m_displayNum(displayNum), m_drawView(new DrawView(imagePath, this)) {
    
    setCentralWidget(m_drawView);
    setWindowFlags(Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint | Qt::Tool | Qt::Popup);
    setAttribute(Qt::WA_ShowWithoutActivating);    
    setAttribute(Qt::WA_TranslucentBackground, false);
    setScreen(screen);
    setGeometry(screen->geometry());

    #ifdef Q_OS_WIN
    #include <dwmapi.h>

    BOOL attrib = TRUE;
    DwmSetWindowAttribute((HWND)winId(), DWMWA_TRANSITIONS_FORCEDISABLED, &attrib, sizeof(attrib));
    #endif

    #ifdef Q_OS_MACOS
    #include <Cocoa/Cocoa.h>

    NSView *nsview = reinterpret_cast<NSView *>(winId());
    NSWindow *nswindow = [nsview window];
    [nswindow setAnimationBehavior: NSWindowAnimationBehaviorNone];
    #endif

    showFullScreen();
}
