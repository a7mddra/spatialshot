import { WebviewBuilder } from '../../shared/webview-builder.js';
import { LENS_AUTOMATION_SCRIPT, sendPasteKeyEvents } from '../../shared/webview-uploader.js';
import { sendEnsureMaximized } from '../../shared/ipc-bridge.js';
import { CaptchaDetector } from '../../shared/captcha-detector.js';

export function createPage() {
  let hasResults = false;
  let captchaDetected = false;

  const wrapper = document.createElement('div');
  wrapper.className = 'page-wrapper';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';

  const { container: webviewContainer, webview } = WebviewBuilder.createLensWebview();

  wrapper.appendChild(webviewContainer);

  const stopMonitoring = CaptchaDetector.monitorForCaptcha(webview, (hasCaptcha, captchaType) => {
    captchaDetected = hasCaptcha;
    if (hasCaptcha) {
      console.log(`Captcha detected in Lens: ${captchaType}`);
      webview.hideSplash();
    } else {
      console.log('Captcha solved or gone in Lens');
    }
  });

  webview.addEventListener('close', () => {
    stopMonitoring();
  });

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
          if (!hasResults && !captchaDetected) {
            console.log('Lens results not detected - doing safe reload');
            webview._safeReload();
          } else {
            console.log('Lens results not detected, but showing old results or captcha is present.');
          }
        }
      })
      .catch(err => console.warn('Lens results check failed:', err));
  }

  return wrapper;
}
