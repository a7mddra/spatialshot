import { sendEnsureMaximized } from '../../shared/ipc-bridge.js';
import { startContinuousPasteUntilUploadComplete } from './uploader.js';

/**
 * Sets up event listeners
 */
export function setupAIEvents(webview, overlay) {
  let pasteStarted = false;

  const startPaste = () => {
    if (pasteStarted) return;
    pasteStarted = true;
    startContinuousPasteUntilUploadComplete(webview, overlay);
  };

  webview.addEventListener('dom-ready', () => {
    console.log('AI Overview page ready');
    sendEnsureMaximized();
    startPaste();
  });

  webview.addEventListener('did-finish-load', () => {
    console.log('AI Overview fully loaded');
    startPaste();
  });
}
