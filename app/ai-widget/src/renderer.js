const pageMap = {
  ai:          './pages/ai/main.js',
  lens:        './pages/lens/main.js',
  text:        './pages/ocr/image-text.js',
  img:         './pages/ocr/image-viewer.js',
  translation: './pages/ocr/translation.js',
  account:     './pages/usr/main.js',
  settings:    './pages/settings/main.js'
};

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
  clearContent(container);

  const mod = await loadPageModule(category);
  if (mod && typeof mod.createPage === 'function') {
    const pageEl = mod.createPage();
    container.appendChild(pageEl);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'page-center';
    fallback.textContent = 'Page unavailable';
    container.appendChild(fallback);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const electronAPI = /** @type {any} */ (window).electronAPI;

  document.querySelectorAll('.cat-btn').forEach(btn => {
    const category = btn.dataset.category;
    btn.addEventListener('click', async (e) => {
      if (!category) return;
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await renderCategory(category);
    });
  });

  const activeBtn = document.querySelector('.cat-btn.active');
  if (activeBtn) {
    const cat = activeBtn.dataset.category;
    if (cat) renderCategory(cat);
  }

  const closeBtn = document.querySelector('.close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => window.close());

  const minimizeBtn = document.querySelector('.minimize-btn');
  if (minimizeBtn) minimizeBtn.addEventListener('click', () => electronAPI?.minimize?.());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.close();
  });
});
