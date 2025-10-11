import { WebviewBuilder } from '../../shared/webview/builder.js';
import { setupAIEvents } from './events.js';

/**
 * createLoadingOverlay({ parent, initial })
 * returns { el, show, hide, setText, setHint, setProgress, destroy }
 */
function createLoadingOverlay({ parent = document.body, initial = true } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'loading-overlay';
  if (!initial) wrapper.classList.add('hidden');

  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-live', 'polite');
  wrapper.innerHTML = `
    <div class="loading-card" aria-hidden="${initial ? 'false' : 'true'}">
      <div class="loading-content">
        <p class="loading-title">Reticulating splines...</p>
        <p class="loading-hint">this may take a few seconds.</p>
        <div class="loading-progress" aria-hidden="true">
          <div class="loading-progress__bar" style="width:36%"></div>
        </div>
      </div>
    </div>
  `;

  parent.appendChild(wrapper);

  const titleEl = wrapper.querySelector('.loading-title');
  const hintEl = wrapper.querySelector('.loading-hint');
  const progressBar = wrapper.querySelector('.loading-progress__bar');
  const cardEl = wrapper.querySelector('.loading-card');

  function show() {
    wrapper.classList.remove('hidden');
    wrapper.setAttribute('aria-hidden', 'false');
    if (cardEl) cardEl.setAttribute('aria-hidden', 'false');
  }
  function hide() {
    wrapper.classList.add('hidden');
    wrapper.setAttribute('aria-hidden', 'true');
    if (cardEl) cardEl.setAttribute('aria-hidden', 'true');
  }
  function setText(title) {
    if (titleEl) titleEl.textContent = title ?? '';
  }
  function setHint(hint) {
    if (hintEl) hintEl.textContent = hint ?? '';
  }
  function setProgress(pct) {
    if (!progressBar) return;
    if (typeof pct === 'number' && isFinite(pct)) {
      progressBar.style.animation = 'none';
      const w = Math.max(0, Math.min(100, pct));
      progressBar.style.width = `${w}%`;
      progressBar.style.transform = 'translateX(0)';
    } else {
      progressBar.style.animation = '';
      if (!progressBar.style.width) progressBar.style.width = '';
    }
  }
  function destroy() {
    if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }

  return { el: wrapper, show, hide, setText, setHint, setProgress, destroy };
}

/**
 * Creates AI Overview page (uses overlay attached to pageContainer)
 */
export function createPage() {
  const pageContainer = document.createElement('div');
  pageContainer.className = 'web-container';

  const { container: webviewContainer, webview } = WebviewBuilder.createAIWebview();
  pageContainer.appendChild(webviewContainer);

  const overlay = createLoadingOverlay({ parent: pageContainer, initial: true });

  setupAIEvents(webview, overlay);

  return pageContainer;
}
