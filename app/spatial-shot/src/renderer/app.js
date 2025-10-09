import * as welcome from '../pages/welcome/index.js';

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

function updateUserAvatar(photoURL) {
  const accountBtn = document.querySelector('.cat-btn[data-category="account"]');
  if (accountBtn) {
    const normalImg = accountBtn.querySelector('img.icon-normal');
    const activeImg = accountBtn.querySelector('img.icon-active');
    if (normalImg) {
      normalImg.src = photoURL;
      normalImg.style.borderRadius = '50%';
    }
    if (activeImg) {
      activeImg.src = photoURL;
      activeImg.style.borderRadius = '50%';
    }
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

      if (welcome.onTabClick(category)) {
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
                console.log('Refresh MongoDB (TODO)');
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
      }
    });
  });

  const activateAiTab = () => {
    const aiBtn = document.querySelector('.cat-btn[data-category="ai"]');
    if (aiBtn) {
      aiBtn.classList.add('active');
      renderCategory('ai');
      preLoadCategory('lens');
    }
  };

  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      electronAPI?.startAuth?.();
    });
  }

  electronAPI.onAuthResult(async (result) => {
    if (result.success && result.user) {
      updateUserAvatar(result.user.photoURL);
      welcome.onActivate(activateAiTab);
    } else {
      console.error('Authentication failed:', result.error);
    }
  });

  const userData = await electronAPI.getUserData();
  if (userData) {
    updateUserAvatar(userData.photoURL);
    welcome.onActivate(activateAiTab, true); // Bypass welcome screen

    // Fire-and-forget verification. Don't await it.
    electronAPI.verifyUserStatus(userData.email)
      .then(verificationResult => {
        if (!verificationResult) return;

        if (verificationResult.status === 'VALID') {
          // Silently update local profile with fresh data from DB
          electronAPI.saveUserData(verificationResult.user);
          if (verificationResult.user.photoURL !== userData.photoURL) {
            updateUserAvatar(verificationResult.user.photoURL);
          }
        } else if (verificationResult.status === 'NOT_FOUND') {
          // User deleted from DB, log them out
          electronAPI.logout();
          window.location.reload();
        }
      })
      .catch(error => {
        // This is the 'no internet' case. Do nothing.
        console.warn('Could not verify user status (likely offline): ', error.message);
      });

  } else {
    welcome.onAppStart();
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
