/**
 * Copyright (C) 2025  a7mddra-spatialshot
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
**/

#include "MainWindow.h"
#include <QApplication>
#include <QImage>
#include <QMouseEvent>
#include <QPainter>
#include <QDebug>
#include <QDir>

#ifdef Q_OS_WIN
#include <dwmapi.h>
#endif
#ifdef Q_OS_MACOS
#include <Cocoa/Cocoa.h>
#endif

DrawView::DrawView(int displayNum, const QString& imagePath, const QString& tmpPath, QWidget* parent)
    : QWidget(parent),
      m_displayNum(displayNum),
      m_tmpPath(tmpPath),
      m_background(imagePath),
      m_smoothedPoint(0,0) {
    
    // Load the image
    if (m_background.isNull()) {
        qWarning() << "Failed to load image:" << imagePath;
        return;
    }

    // Configure widget for drawing
    setMouseTracking(true);
    setCursor(Qt::CrossCursor);
    setContentsMargins(0, 0, 0, 0);
    setFixedSize(m_background.size()); // Match image size exactly

    clearCanvas();
}

void DrawView::mousePressEvent(QMouseEvent* event) {
    if (event->button() == Qt::LeftButton) {
        if (m_hasDrawing) clearCanvas();
        m_isDrawing = true;
        
        m_smoothedPoint = event->pos();
        m_path.moveTo(m_smoothedPoint);
        updateBounds(m_smoothedPoint.x(), m_smoothedPoint.y());
        
        update(); // Trigger repaint
    }
}

void DrawView::mouseMoveEvent(QMouseEvent* event) {
    if (!m_isDrawing) return;
    
    QPointF currentPoint = event->pos();
    QPointF newSmoothedPoint = (m_smoothedPoint * (1.0 - m_smoothingFactor)) + (currentPoint * m_smoothingFactor);
    QPointF midPoint = (m_smoothedPoint + newSmoothedPoint) / 2.0;
    m_path.quadTo(m_smoothedPoint, midPoint);
    
    m_smoothedPoint = newSmoothedPoint;
    updateBounds(m_smoothedPoint.x(), m_smoothedPoint.y());
    update(); // Trigger repaint
}

void DrawView::mouseReleaseEvent(QMouseEvent* event) {
    if (event->button() == Qt::LeftButton && m_isDrawing) {
        m_path.lineTo(m_smoothedPoint);
        m_isDrawing = false;
        m_hasDrawing = true;
        
        cropAndSave();
    }
}

void DrawView::keyPressEvent(QKeyEvent* event) {
    if (event->key() == Qt::Key_Escape || event->key() == Qt::Key_Q) {
        QApplication::quit();
    }
}

void DrawView::paintEvent(QPaintEvent* event) {
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing, true);

    // Draw the background image
    painter.drawImage(0, 0, m_background);

    // Draw layered glow effect to simulate blur
    const int glowLayers = 5; // Number of glow layers for smooth fade
    const qreal maxGlowWidth = m_brushSize + m_glowAmount * 2.0; // Wider glow for diffusion
    for (int i = glowLayers; i >= 0; --i) {
        qreal glowWidth = m_brushSize + (m_glowAmount * 2.0 * i / static_cast<qreal>(glowLayers));
        int alpha = 50 + (150 * (glowLayers - i) / static_cast<qreal>(glowLayers)); // Gradual fade
        QColor glowColor(Qt::white);
        glowColor.setAlpha(alpha);
        QPen glowPen(glowColor, glowWidth, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
        painter.setPen(glowPen);
        painter.setCompositionMode(QPainter::CompositionMode_Screen); // Luminous glow
        painter.drawPath(m_path);
    }

    // Draw the main stroke
    QPen mainPen(m_brushColor, m_brushSize, Qt::SolidLine, Qt::RoundCap, Qt::RoundJoin);
    mainPen.setColor(Qt::white); // Pure white for core stroke
    painter.setPen(mainPen);
    painter.setCompositionMode(QPainter::CompositionMode_SourceOver); // Normal blending for core
    painter.drawPath(m_path);
}

void DrawView::updateBounds(qreal x, qreal y) {
    qreal brushRadius = m_brushSize / 2 + m_glowAmount / 2;
    m_minX = qMin(m_minX, x - brushRadius);
    m_maxX = qMax(m_maxX, x + brushRadius);
    m_minY = qMin(m_minY, y - brushRadius);
    m_maxY = qMax(m_maxY, y + brushRadius);
}

void DrawView::clearCanvas() {
    m_path = QPainterPath();
    m_isDrawing = false;
    m_hasDrawing = false;
    m_minX = m_background.width();
    m_maxX = 0;
    m_minY = m_background.height();
    m_maxY = 0;
    update(); // Trigger repaint
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

    QString outputPath = QDir(m_tmpPath).filePath(QString("o%1.png").arg(m_displayNum));

    // Crop the original background image without the drawing
    QImage cropped = m_background.copy(clampedX, clampedY, clampedWidth, clampedHeight);
    if (!cropped.save(outputPath, "PNG", 100)) {
        qWarning() << "Failed to save cropped image:" << outputPath;
    } else {
        qDebug() << "Cropped image saved to:" << outputPath;
    }

    QApplication::quit();
}

MainWindow::MainWindow(int displayNum, const QString& imagePath, const QString& tmpPath, QScreen* screen, QWidget* parent)
    : QMainWindow(parent), 
      m_displayNum(displayNum), 
      m_drawView(new DrawView(m_displayNum, imagePath, tmpPath, this)) {
    
    setCentralWidget(m_drawView);
    setWindowFlags(Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint | Qt::Tool | Qt::Popup);
    setAttribute(Qt::WA_ShowWithoutActivating);    
    setAttribute(Qt::WA_TranslucentBackground, false);
    setScreen(screen);
    setGeometry(screen->geometry());
    
    // Ensure no margins
    setContentsMargins(0, 0, 0, 0);
    m_drawView->setContentsMargins(0, 0, 0, 0);

    #ifdef Q_OS_WIN
    BOOL attrib = TRUE; 
    DwmSetWindowAttribute(reinterpret_cast<HWND>(winId()), DWMWA_TRANSITIONS_FORCEDISABLED, &attrib, sizeof(attrib));
    #endif

    #ifdef Q_OS_MACOS
    NSView *nsview = reinterpret_cast<NSView *>(winId());
    NSWindow *nswindow = [nsview window];
    [nswindow setAnimationBehavior: NSWindowAnimationBehaviorNone];
    #endif

    showFullScreen();
}