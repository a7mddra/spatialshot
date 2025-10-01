const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const screenshotBg = document.getElementById('screenshot-bg');
const boundsDiv = document.getElementById('bounds');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let isDrawing = false;
let hasDrawing = false;
let lastPoint = null;

let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
const brushColor = '#FFFFFF', brushSize = 5, glowAmount = 10;

window.electronAPI.onScreenshotCaptured((screenshotDataURL) => {
  screenshotBg.src = screenshotDataURL;
  screenshotBg.onload = () => {
    window.electronAPI.signalImageReady();
  };
});

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawing = false;
    minX = canvas.width; maxX = 0; minY = canvas.height; maxY = 0;
    boundsDiv.style.display = 'none';
}

function getMousePos(e) {
    return { x: e.clientX, y: e.clientY };
}

function startDrawing(e) {
    if (hasDrawing) clearCanvas();
    isDrawing = true;
    lastPoint = getMousePos(e);
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    ctx.shadowBlur = glowAmount;
    ctx.shadowColor = brushColor;
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    updateBounds(lastPoint.x, lastPoint.y);
}

function draw(e) {
    if (!isDrawing) return;
    const currentPoint = getMousePos(e);
    updateBounds(currentPoint.x, currentPoint.y);
    const midPoint = {
        x: (lastPoint.x + currentPoint.x) / 2,
        y: (lastPoint.y + currentPoint.y) / 2
    };
    ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(midPoint.x, midPoint.y);
    lastPoint = currentPoint;
}

function stopDrawing() {
    if (!isDrawing) return;
    if (lastPoint) {
        ctx.lineTo(lastPoint.x, lastPoint.y);
        ctx.stroke();
    }
    isDrawing = false;
    hasDrawing = true;
    ctx.beginPath();
    updateBoundsDisplay();
    
    // ----> NEW LOGIC: CROP AND EXIT <----
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Send the crop data to the main process
    if (width > 0 && height > 0) {
        window.electronAPI.cropAndSave({
            x: minX,
            y: minY,
            width: width,
            height: height
        });
    } else {
        // If user just clicks without dragging, quit without saving.
        app.quit();
    }
}

function updateBounds(x, y) {
    const brushRadius = brushSize / 2 + glowAmount / 2;
    minX = Math.min(minX, x - brushRadius);
    maxX = Math.max(maxX, x + brushRadius);
    minY = Math.min(minY, y - brushRadius);
    maxY = Math.max(maxY, y + brushRadius);
}

function updateBoundsDisplay() {
    const width = maxX - minX;
    const height = maxY - minY;
    if (width > 0 && height > 0) {
        boundsDiv.style.display = 'block';
        boundsDiv.style.left = `${minX}px`;
        boundsDiv.style.top = `${minY}px`;
        boundsDiv.style.width = `${width}px`;
        boundsDiv.style.height = `${height}px`;
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    clearCanvas();
});