import { sendEnsureMaximized } from '../../shared/ipc-bridge.js';
import { startContinuousPasteUntilUploadComplete } from './uploader.js';

/**
 * Sets up event listeners
 */
export function setupAIEvents(webview) {
  webview.addEventListener('dom-ready', () => {
    console.log('AI Overview page ready');
    sendEnsureMaximized();
    startContinuousPasteUntilUploadComplete(webview);
  });

  webview.addEventListener('did-finish-load', () => {
    console.log('AI Overview fully loaded');
    startContinuousPasteUntilUploadComplete(webview);
  });
}
