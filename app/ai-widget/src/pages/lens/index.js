import { WebviewBuilder } from '../../shared/webview-builder.js';
import { LENS_AUTOMATION_SCRIPT, sendPasteKeyEvents } from '../../shared/webview-uploader.js';
import { sendEnsureMaximized } from '../../shared/ipc-bridge.js';

export function createPage() {
  let hasResults = false;

  const wrapper = document.createElement('div');
  wrapper.className = 'page-wrapper';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';

  const { container: webviewContainer, webview } = WebviewBuilder.createLensWebview();

  wrapper.appendChild(webviewContainer);

  webview.addEventListener('dom-ready', () => {
    console.log('Lens DOM ready (page-level)');
    sendEnsureMaximized();
    webview.executeJavaScript(LENS_AUTOMATION_SCRIPT).catch(console.warn);
    sendPasteKeyEvents(webview, 500);

    setTimeout(() => checkLensResultsAndRetry(webview), 1500);
  });

  function checkLensResultsAndRetry(webview) {
    const checkScript = `
      (function() {
        const resultsContainer = document.querySelector('div.UNBEIe, div[jsname="YwwFvf"]');
        return resultsContainer !== null;
      })();
    `;

    webview.executeJavaScript(checkScript)
      .then(resultsFound => {
        if (resultsFound) {
          hasResults = true;
          console.log('Lens results detected');
        } else {
          if (!hasResults) {
            console.log('Lens results not detected - doing safe reload');
            webview._safeReload();
          } else {
            console.log('Lens results not detected, but showing old results.');
          }
        }
      })
      .catch(err => console.warn('Lens results check failed:', err));
  }

  return wrapper;
}
