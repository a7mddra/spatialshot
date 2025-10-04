import { WebviewBuilder } from '../../shared/webview-builder.js';
import { setupAIEvents } from './events.js';

/**
 * Creates AI Overview page
 */
export function createPage() {
  const pageContainer = document.createElement('div');
  pageContainer.className = 'web-container';

  // builder returns { container, webview }
  const { container: webviewContainer, webview } = WebviewBuilder.createAIWebview();

  // append the wrapper (contains overlay + webview)
  pageContainer.appendChild(webviewContainer);

  // wire events to the actual webview element
  setupAIEvents(webview);

  return pageContainer;
}
