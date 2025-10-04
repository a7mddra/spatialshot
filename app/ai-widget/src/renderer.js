const pageMap = {
  ai:       './pages/ai/index.js',
  lens:     './pages/lens/index.js',
  account:  './pages/usr/index.js',
  settings: './pages/settings/index.js'
};

let currentImagePath = null;
let currentCategory = null;
let isRendering = false;

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

async function renderCategory(category) {
  const container = document.getElementById('content-container');
  if (!container) return;

  if (isRendering && currentCategory === category) {
    console.log('renderCategory: already rendering', category);
    return;
  }

  isRendering = true;
  currentCategory = category;

  try {
    container.replaceChildren();

    const mod = await loadPageModule(category);
    if (mod && typeof mod.createPage === 'function') {
      const pageEl = mod.createPage(currentImagePath);
      container.replaceChildren(pageEl);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'page-center';
      const message = document.createElement('div');
      message.className = 'page-text';
      message.textContent = currentImagePath
        ? `Processing image for ${category}...`
        : 'No image provided. Please launch with an image path.';
      fallback.appendChild(message);
      container.replaceChildren(fallback);
    }
  } catch (err) {
    console.error('renderCategory error', err);
  } finally {
    isRendering = false;
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

  const aiBtn = document.querySelector('.cat-btn[data-category="ai"]');
  if (aiBtn) {
    aiBtn.click();
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
