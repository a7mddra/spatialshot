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

function loadAndDisplayImage(imagePath, canvas, ctx, copyButton) {
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

function makeCanvasResponsive(canvas, ctx, imagePath) {
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

function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
  return {
    width: srcWidth * ratio,
    height: srcHeight * ratio
  };
}

function createFullscreenViewer(imagePath) {
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

function enterFullscreen(element) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

let originalEscapeHandler = null;

function disableAppEscape() {
  if (!originalEscapeHandler) {
    originalEscapeHandler = window.handleEscape;
  }
  window.handleEscape = () => {};
}

function enableAppEscape() {
  if (originalEscapeHandler) {
    window.handleEscape = originalEscapeHandler;
    originalEscapeHandler = null;
  }
}

function setupCanvasClick(canvas, imagePath) {
  canvas.style.cursor = 'pointer';
  canvas.title = 'Click to view image fullscreen (ESC to exit)';
  
  canvas.addEventListener('click', () => {
    createFullscreenViewer(imagePath);
  });
}

function setupCopyButton(button, imagePath) {
  button.addEventListener('click', async () => {
   
    button.classList.add('loading');
    button.disabled = true;
    
    await copyOriginalImage(button, imagePath);
    
   
    button.classList.remove('loading');
    button.disabled = false;
  });
}

async function copyOriginalImage(button, imagePath) {
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
