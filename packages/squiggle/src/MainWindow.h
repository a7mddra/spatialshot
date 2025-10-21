/**
 *  Copyright (C) 2025  a7mddra-spatialshot
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
**/

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
    QPointF m_smoothedPoint; 
    const qreal m_smoothingFactor = 0.2; 
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

#endif
