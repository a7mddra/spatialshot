/**
 * createFullscreenViewer(imagePath)
 * - same DOM overlay, help text, fullscreen enter/exit behavior
 */
export function createFullscreenViewer(imagePath) {
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-viewer-overlay';

  const container = document.createElement('div');
  container.className = 'fullscreen-viewer';

  const img = document.createElement('img');
  img.src = `file://${imagePath}`;
  img.className = 'fullscreen-image';

  const helpText = document.createElement('div');
  helpText.className = 'fullscreen-help';
  helpText.textContent = 'Press ESC to exit fullscreen';

  container.appendChild(img);
  container.appendChild(helpText);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  setTimeout(() => {
    helpText.classList.add('visible');
  }, 100);

  setTimeout(() => {
    helpText.classList.remove('visible');
  }, 3000);

  enterFullscreen(overlay);

  const cleanup = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    enableAppEscape();
  };

  const handleFullscreenChange = () => {
    if (!document.fullscreenElement) {
      cleanup();
    }
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);

  disableAppEscape();

  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      exitFullscreen();
      cleanup();
      e.stopPropagation();
    }
  };

  document.addEventListener('keydown', handleKeydown, true);

  overlay._cleanup = () => {
    document.removeEventListener('keydown', handleKeydown, true);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    enableAppEscape();
  };
}

/**
 * enterFullscreen / exitFullscreen
 * - cross-browser requests as before
 */
export function enterFullscreen(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

export function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

/**
 * disableAppEscape / enableAppEscape
 * - same global escape handler swap as original
 */
let originalEscapeHandler = null;

export function disableAppEscape() {
  if (!originalEscapeHandler) {
    originalEscapeHandler = window.handleEscape;
  }
  window.handleEscape = () => {};
}

export function enableAppEscape() {
  if (originalEscapeHandler) {
    window.handleEscape = originalEscapeHandler;
    originalEscapeHandler = null;
  }
}
