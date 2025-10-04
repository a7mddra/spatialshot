import { loadAndDisplayImage } from './image-loader.js';

export function createPage(imagePath) {
  const wrap = document.createElement('div');
  wrap.className = 'image-viewer-container';

  if (!imagePath) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'page-center';
    const text = document.createElement('div');
    text.className = 'page-text';
    text.textContent = 'No image provided';
    errorMsg.appendChild(text);
    wrap.appendChild(errorMsg);
    return wrap;
  }

  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const copyButton = document.createElement('button');
  copyButton.className = 'copy-image-btn';
  copyButton.innerHTML = `
    <img src="../assets/nav/cpy-img.svg" class="btn-icon" alt="Copy icon">
    <span class="btn-text">Copy as Image</span>
  `;

  canvasContainer.appendChild(canvas);
  canvasContainer.appendChild(copyButton);
  wrap.appendChild(canvasContainer);

  loadAndDisplayImage(imagePath, canvas, ctx, copyButton);

  return wrap;
}
