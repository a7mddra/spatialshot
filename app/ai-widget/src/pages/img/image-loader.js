import { setupCanvasClick, setupCopyButton } from './interactions.js';

/**
 * loadAndDisplayImage(imagePath, canvas, ctx, copyButton)
 * - Exactly same logic as your original function
 */
export function loadAndDisplayImage(imagePath, canvas, ctx, copyButton) {
  try {
    const img = new Image();
    let cleanupResize = null;

    img.onload = function() {
      const container = document.querySelector('.image-viewer-container');
      const maxWidth = container.clientWidth;
      const maxHeight = container.clientHeight;

      let { width, height } = calculateAspectRatioFit(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      canvas.width = width;
      canvas.height = height;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.webkitImageSmoothingEnabled = true;
      ctx.mozImageSmoothingEnabled = true;
      ctx.msImageSmoothingEnabled = true;
      ctx.oImageSmoothingEnabled = true;

      ctx.clearRect(0, 0, width, height);

      ctx.drawImage(img, 0, 0, width, height);

      setupCanvasClick(canvas, imagePath);
      setupCopyButton(copyButton, imagePath);
      cleanupResize = makeCanvasResponsive(canvas, ctx, imagePath);
    };

    img.onerror = function() {
      copyButton.textContent = 'Error loading image';
      copyButton.classList.add('error');
      copyButton.disabled = true;
    };

    img.crossOrigin = 'anonymous';
    img.src = `file://${imagePath}`;
  } catch (error) {
    console.error('Error loading image:', error);
    copyButton.textContent = 'Error loading image';
    copyButton.classList.add('error');
    copyButton.disabled = true;
  }
}

/**
 * makeCanvasResponsive(canvas, ctx, imagePath)
 * - Same behavior: resizes with window and returns a cleanup function
 */
export function makeCanvasResponsive(canvas, ctx, imagePath) {
  const resizeCanvas = () => {
    const container = canvas.parentElement;
    const maxWidth = container.clientWidth - 40;
    const maxHeight = container.clientHeight - 100;

    const img = new Image();
    img.onload = function() {
      const { width, height } = calculateAspectRatioFit(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      canvas.width = width;
      canvas.height = height;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = `file://${imagePath}`;
  };

  resizeCanvas();

  window.addEventListener('resize', resizeCanvas);
  return () => window.removeEventListener('resize', resizeCanvas);
}

/**
 * calculateAspectRatioFit - same helper as before
 */
export function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio
  };
}
