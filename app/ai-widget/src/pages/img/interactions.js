import { createFullscreenViewer } from './fullscreen.js';

/**
 * setupCanvasClick(canvas, imagePath)
 * - identical behavior: cursor, title, click to open fullscreen
 */
export function setupCanvasClick(canvas, imagePath) {
  canvas.style.cursor = 'pointer';
  canvas.title = 'Click to view image fullscreen (ESC to exit)';

  canvas.addEventListener('click', () => {
    createFullscreenViewer(imagePath);
  });
}

/**
 * setupCopyButton(button, imagePath)
 * - identical UI state changes, calls copyOriginalImage
 */
export function setupCopyButton(button, imagePath) {
  button.addEventListener('click', async () => {
    button.classList.add('loading');
    button.disabled = true;

    await copyOriginalImage(button, imagePath);

    button.classList.remove('loading');
    button.disabled = false;
  });
}

/**
 * copyOriginalImage(button, imagePath)
 * - same electronAPI usage and DOM updates as original
 */
export async function copyOriginalImage(button, imagePath) {
  try {
    const electronAPI = window.electronAPI;
    if (electronAPI && electronAPI.copyOriginalImage) {
      const success = await electronAPI.copyOriginalImage(imagePath);
      if (success) {
        button.innerHTML = `
          <img src="../assets/cpd-img.svg" class="btn-icon" alt="Copied icon">
          <span class="btn-text">Image copied</span>
        `;
        button.classList.add('success');

        setTimeout(() => {
          button.innerHTML = `
            <img src="../assets/nav/cpy-img.svg" class="btn-icon" alt="Copy icon">
            <span class="btn-text">Copy as Image</span>
          `;
          button.classList.remove('success');
        }, 2000);
      } else {
        button.classList.add('error');
        setTimeout(() => {
          button.classList.remove('error');
        }, 2000);
      }
    } else {
      button.classList.add('error');
      setTimeout(() => {
        button.classList.remove('error');
      }, 2000);
    }
  } catch (error) {
    console.error('Error copying image:', error);
    button.classList.add('error');
    setTimeout(() => {
      button.classList.remove('error');
    }, 2000);
  }
}
