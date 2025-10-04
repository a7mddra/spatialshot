import { WebviewBuilder } from '../../shared/webview-builder.js';
import { LENS_AUTOMATION_SCRIPT, sendPasteKeyEvents } from '../../shared/webview-uploader.js';
import { sendEnsureMaximized } from '../../shared/ipc-bridge.js';

export function createPage() {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-wrapper';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';

  // create the wrapped webview
  const { container: webviewContainer, webview } = WebviewBuilder.createLensWebview();

  // append container (which contains overlay + webview)
  wrapper.appendChild(webviewContainer);

  // keep your event wiring (dom-ready will still fire and automation still works)
  webview.addEventListener('dom-ready', () => {
    console.log('Lens DOM ready (page-level)');
    sendEnsureMaximized();
    // automation script
    webview.executeJavaScript(LENS_AUTOMATION_SCRIPT).catch(console.warn);
    sendPasteKeyEvents(webview, 500);

    // result check uses safe reload when necessary:
    setTimeout(() => checkLensResultsAndRetry(webview), 1500);
  });

  return wrapper;
}

function checkLensResultsAndRetry(webview) {
  const checkScript = `
    (function() {
      const resultsContainer = document.querySelector('div.UNBEIe, div[jsname="YwwFvf"]');
      return resultsContainer !== null;
    })();
  `;

  webview.executeJavaScript(checkScript)
    .then(resultsFound => {
      if (!resultsFound) {
        console.log('Lens results not detected - doing safe reload');
        // use safe reload so overlay shows only for this full reload
        webview._safeReload();
        // on reload dom-ready will fire and automation re-run from your dom-ready listener
      } else {
        console.log('Lens results detected');
      }
    })
    .catch(err => console.warn('Lens results check failed:', err));
}
