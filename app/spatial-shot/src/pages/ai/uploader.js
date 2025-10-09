import { sendPasteKeyEvents } from '../../shared/webview-uploader.js';
import { injectAIPrompt } from './prompt-injector.js';

/**
 * Continuously paste until upload is detected AND completed, then inject prompt
 */
export function uploadImage(webview, overlay) {
  let pasteInterval;
  let checkInterval;
  let maxAttempts = 50;
  let attemptCount = 0;
  let uploadStarted = false;

  const checkForUploadComplete = () => {
    const checkScript = `
      (function() {
        const uploadContainer = document.querySelector('div.gcB4oc.Gy230b');
        if (!uploadContainer) return { found: false, done: false };

        const progress = uploadContainer.querySelector('[role="progressbar"], [data-progressvalue]');
        const img = uploadContainer.querySelector('img.AoJF8e');

        if (img && img.src && img.src.startsWith('data:') && !progress) {
          return { found: true, done: true, reason: 'image-without-progress' };
        }

        if (progress) {
          const aria = progress.getAttribute('aria-label') || '';
          const dpv = progress.getAttribute('data-progressvalue');
          const style = progress.getAttribute('style') || '';
          const pv = dpv !== null ? Number(dpv) : (style.match(/--progress-value\\s*:\\s*(\\d+)/) || [])[1];
          const pvNum = pv !== undefined ? Number(pv) : null;
          const uploadingText = /uploading/i.test(aria);
          
          if (pvNum !== null && !Number.isNaN(pvNum) && pvNum >= 100) {
            return { found: true, done: true, reason: 'progress-100' };
          }
          if (!uploadingText && img && img.src && img.src.startsWith('data:')) {
            return { found: true, done: true, reason: 'img-present-no-upload-text' };
          }
          
          return { found: true, done: false, progressValue: pvNum, aria };
        }

        return { found: true, done: false, reason: 'container-present-no-progress' };
      })();
    `;

    webview.executeJavaScript(checkScript)
      .then(result => {
        if (result.found && !uploadStarted) {
          console.log('Upload started! Stopping paste loop, waiting for completion...');
          uploadStarted = true;
          clearInterval(pasteInterval);
        }

        if (result.done) {
          console.log('Upload completed! Injecting prompt...');
          clearInterval(pasteInterval);
          clearInterval(checkInterval);
          injectAIPrompt(webview);
          overlay.hide();
        }
      })
      .catch(err => console.warn('Upload check failed:', err));
  };

  const sendPaste = () => {
    if (attemptCount >= maxAttempts) {
      console.log('Max paste attempts reached, stopping');
      clearInterval(pasteInterval);
      clearInterval(checkInterval);
      setTimeout(() => injectAIPrompt(webview), 1000);
      overlay.hide();
      return;
    }

    attemptCount++;
    console.log(`Paste attempt ${attemptCount}/${maxAttempts}`);
    
    try {
      sendPasteKeyEvents(webview, 0);
    } catch (e) {
      console.warn('Paste failed:', e);
    }
  };

  pasteInterval = setInterval(sendPaste, 500);
  checkInterval = setInterval(checkForUploadComplete, 300);
  sendPaste();
}
