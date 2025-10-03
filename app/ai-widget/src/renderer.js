const pageMap = {
  ai:          './pages/ai/main.js',
  lens:        './pages/lens/main.js',
  text:        './pages/ocr/image-text.js',
  img:         './pages/ocr/image-viewer.js',
  translation: './pages/ocr/translation.js',
  account:     './pages/usr/main.js',
  settings:    './pages/settings/main.js'
};

let currentImagePath = null;
let currentCategory = null;

async function loadPageModule(category) {
  const modulePath = pageMap[category];
  if (!modulePath) return null;
  try {
    const mod = await import(modulePath);
    return mod;
  } catch (err) {
    console.error('Failed to import page', modulePath, err);
    return null;
  }
}

function clearContent(container) {
  container.innerHTML = '';
}

async function renderCategory(category) {
  const container = document.getElementById('content-container');
  if (!container) return;
  
  currentCategory = category;
  clearContent(container);

  const mod = await loadPageModule(category);
  if (mod && typeof mod.createPage === 'function') {
    const pageEl = category === 'lens' ? mod.createPage() : mod.createPage(currentImagePath);
    container.appendChild(pageEl);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'page-center';
    
    const message = document.createElement('div');
    message.className = 'page-text';
    message.textContent = currentImagePath 
      ? `Processing image for ${category}...` 
      : 'No image provided. Please launch with an image path.';
    
    fallback.appendChild(message);
    container.appendChild(fallback);
  }
}

function initializeApp() {
  const electronAPI = /** @type {any} */ (window).electronAPI;
  
  currentImagePath = electronAPI?.getImagePath?.() || null;
  
  electronAPI?.onImagePathUpdate?.(async (newImagePath) => {
    console.log('Image path updated:', newImagePath);
    currentImagePath = newImagePath;
    
    if (currentCategory) {
      await renderCategory(currentCategory);
    }
  });

  document.querySelectorAll('.cat-btn').forEach(btn => {
    const category = btn.dataset.category;
    btn.addEventListener('click', async (e) => {
      if (!category) return;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await renderCategory(category);
    });
  });

  // Select and render 'ai' tab by default
  const aiBtn = document.querySelector('.cat-btn[data-category="ai"]');
  if (aiBtn) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    aiBtn.classList.add('active');
    renderCategory('ai');
  }

  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => window.close());

  const minimizeBtn = document.querySelector('.minimize-btn');
  if (minimizeBtn) minimizeBtn.addEventListener('click', () => electronAPI?.minimize?.());

  const maximizeBtn = document.querySelector('.maximize-btn');
  if (maximizeBtn) maximizeBtn.addEventListener('click', () => electronAPI?.maximize?.());

  window.handleEscape = () => {
    window.close();
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.handleEscape();
    }
  });
}

document.addEventListener('DOMContentLoaded', initializeApp);
