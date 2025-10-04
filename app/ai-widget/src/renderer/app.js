const pageMap = {
  ai:       '../pages/ai/index.js',
  lens:     '../pages/lens/index.js',
  account:  '../pages/usr/index.js',
  settings: '../pages/settings/index.js'
};

let currentImagePath = null;
let currentCategory = null;
let isRendering = false;
const pageCache = {};

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
    for (const child of container.children) {
      child.style.display = 'none';
    }

    if (pageCache[category]) {
      pageCache[category].style.display = 'flex';
    } else {
      const mod = await loadPageModule(category);
      let pageEl;
      if (mod && typeof mod.createPage === 'function') {
        pageEl = mod.createPage(currentImagePath);
      } else {
        pageEl = document.createElement('div');
        pageEl.className = 'page-center';
        const message = document.createElement('div');
        message.className = 'page-text';
        message.textContent = currentImagePath
          ? `Processing image for ${category}...`
          : 'No image provided. Please launch with an image path.';
        pageEl.appendChild(message);
      }
      pageCache[category] = pageEl;
      container.appendChild(pageEl);
      pageEl.style.display = 'flex';
    }
  } catch (err) {
    console.error('renderCategory error', err);
  } finally {
    isRendering = false;
  }
}

async function preLoadCategory(category) {
  const container = document.getElementById('content-container');
  if (!container || pageCache[category]) return;

  try {
    const mod = await loadPageModule(category);
    let pageEl;
    if (mod && typeof mod.createPage === 'function') {
      pageEl = mod.createPage(currentImagePath);
    } else {
      pageEl = document.createElement('div');
      pageEl.className = 'page-center';
      const message = document.createElement('div');
      message.className = 'page-text';
      message.textContent = currentImagePath
        ? `Processing image for ${category}...`
        : 'No image provided. Please launch with an image path.';
      pageEl.appendChild(message);
    }
    pageCache[category] = pageEl;
    container.appendChild(pageEl);
    pageEl.style.display = 'none';
  } catch (err) {
    console.error('preLoadCategory error', err);
  }
}

async function initializeApp() {
  const electronAPI = /** @type {any} */ (window).electronAPI;

  currentImagePath = electronAPI?.getImagePath?.() || null;

  electronAPI?.onImagePathUpdate?.(async (newImagePath) => {
    console.log('Image path updated:', newImagePath);
    currentImagePath = newImagePath;

    if (currentCategory) {
      await renderCategory(currentCategory);
    }
  });

  let lastClickInfo = { time: 0, category: null };

  document.querySelectorAll('.cat-btn').forEach(btn => {
    const category = btn.dataset.category;
    btn.addEventListener('click', async () => {
      if (!category) return;

      const now = Date.now();
      const { time, category: lastCategory } = lastClickInfo;

      if (lastCategory === category && now - time < 300) {

        if (pageCache[category]) {
          const webview = pageCache[category].querySelector('webview');
          switch (category) {
            case 'ai':
            case 'lens':
              if (webview) {
                await webview._clearCache();
                webview._safeReload();
              }
              break;
            case 'account':
              console.log('Refresh Firebase (TODO)');
              break;
            case 'settings':
              break;
          }
        }
      } else {
        lastClickInfo = { time: now, category };

        if (!btn.classList.contains('active')) {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            await renderCategory(category);
        }
      }
    });
  });

  const aiBtn = document.querySelector('.cat-btn[data-category="ai"]');
  if (aiBtn) {
    aiBtn.classList.add('active');
    await renderCategory('ai');
    preLoadCategory('lens');
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
